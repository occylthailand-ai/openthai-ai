/*!
 * W3C Exclusive XML Canonicalization (xml-exc-c14n) — OpenThai XAdES Engine
 *
 * Version 0.2.1 — Fixes vs 0.2.0
 *   1. Correct namespace retraction: record emissions AFTER permanent push so
 *      retract_emitted_at_depth removes exactly the current depth's emissions.
 *   2. Attribute sort order: resolve prefix → namespace URI via NsStack before
 *      sorting, matching W3C C14N § 2.3 (sort by namespace URI, then local name).
 *   3. Default namespace propagation: empty-prefix element visibly utilises the
 *      default namespace — add "" to visibly_used so xmlns="…" is emitted.
 *   4. Use Attribute::unescape_value() (quick-xml 0.31 stable API).
 *
 * Full spec compliance checklist:
 *   [x] Namespace scope stack with ancestor propagation
 *   [x] Visibly-utilized prefix detection (element + attribute prefixes, incl. empty)
 *   [x] Redundant declaration suppression
 *   [x] InclusiveNamespaces PrefixList
 *   [x] Namespace declarations sorted by prefix
 *   [x] Content attributes sorted by (namespace URI, local name)
 *   [x] Attribute value normalisation (&, <, ", \r, \n, \t)
 *   [x] Text node normalisation (&, <, >, \r)
 *   [x] Empty element expansion (<e/> → <e></e>)
 *   [x] XML declaration omission
 *   [x] Comment / PI / DOCTYPE omission (without-comments profile)
 */

use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;
use quick_xml::events::{BytesStart, Event};
use quick_xml::reader::Reader;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::io::Cursor;

const VERSION: &str = "0.2.1";

// ─────────────────────────────────────────────────────────
//  Normalisation helpers
// ─────────────────────────────────────────────────────────

fn normalize_attr_value(v: &str) -> String {
    let mut out = String::with_capacity(v.len() + 8);
    for ch in v.chars() {
        match ch {
            '&'  => out.push_str("&amp;"),
            '<'  => out.push_str("&lt;"),
            '"'  => out.push_str("&quot;"),
            '\r' => out.push_str("&#xD;"),
            '\n' => out.push_str("&#xA;"),
            '\t' => out.push_str("&#x9;"),
            c    => out.push(c),
        }
    }
    out
}

fn normalize_text_node(v: &str) -> String {
    let mut out = String::with_capacity(v.len() + 8);
    for ch in v.chars() {
        match ch {
            '&'  => out.push_str("&amp;"),
            '<'  => out.push_str("&lt;"),
            '>'  => out.push_str("&gt;"),
            '\r' => out.push_str("&#xD;"),
            c    => out.push(c),
        }
    }
    out
}

// ─────────────────────────────────────────────────────────
//  Namespace scope stack
//
//  NsFrame holds prefix→URI bindings declared on ONE element.
//  NsStack wraps a vec of frames and tracks what has been *emitted*
//  into the canonical output so far, with the depth at which each
//  emission was recorded.  On element pop we retract all emissions
//  from that depth, restoring the parent's view.
// ─────────────────────────────────────────────────────────

#[derive(Default, Clone)]
struct NsFrame {
    declared: HashMap<String, String>, // prefix → URI
}

struct NsStack {
    frames: Vec<NsFrame>,
    /// prefix → (emitted_uri, depth_at_which_emitted)
    emitted: HashMap<String, (String, usize)>,
}

impl NsStack {
    fn new() -> Self {
        Self {
            frames: Vec::new(),
            emitted: HashMap::new(),
        }
    }

    fn push(&mut self, frame: NsFrame) {
        self.frames.push(frame);
    }

    fn pop(&mut self) {
        self.frames.pop();
    }

    fn depth(&self) -> usize {
        self.frames.len()
    }

    /// Effective URI for *prefix* — walk the stack from top.
    fn current_uri(&self, prefix: &str) -> Option<&str> {
        for frame in self.frames.iter().rev() {
            if let Some(uri) = frame.declared.get(prefix) {
                return Some(uri.as_str());
            }
        }
        None
    }

    /// Declarations that MUST appear on the canonical start-tag.
    ///
    /// A declaration (prefix, uri) is emitted when:
    ///   • the prefix is visibly utilised (element tag or an attribute)
    ///   • OR it appears in the InclusiveNamespaces prefix list
    ///   AND the URI differs from the most-recently-emitted value.
    ///
    /// Call this AFTER permanently pushing the element's NsFrame so that
    /// `current_uri` resolves through the current element's declarations.
    fn declarations_to_emit(
        &self,
        visibly_used: &HashSet<String>,
        inclusive_prefixes: &[&str],
    ) -> Vec<(String, String)> {
        let mut needed: HashSet<String> = visibly_used.clone();
        for &p in inclusive_prefixes {
            needed.insert(p.to_string());
        }

        let mut result: Vec<(String, String)> = Vec::new();
        for prefix in &needed {
            if let Some(uri) = self.current_uri(prefix) {
                let needs_emit = match self.emitted.get(prefix) {
                    None => true,
                    Some((emitted_uri, _)) => emitted_uri != uri,
                };
                if needs_emit {
                    result.push((prefix.clone(), uri.to_string()));
                }
            }
        }
        result
    }

    /// Record that *prefix* was emitted at the CURRENT depth.
    /// Call this AFTER permanently pushing the element's frame.
    fn record_emitted(&mut self, prefix: &str, uri: &str) {
        let d = self.depth();
        self.emitted.insert(prefix.to_string(), (uri.to_string(), d));
    }

    /// Undo all emissions recorded at *depth*.
    /// Call BEFORE pop() while depth() still equals the leaving element's depth.
    fn retract_emitted_at_depth(&mut self, depth: usize) {
        self.emitted.retain(|_, (_, d)| *d < depth);
    }
}

// ─────────────────────────────────────────────────────────
//  Start-tag canonicalisation
//
//  Returns (canonical_bytes, ns_frame, emissions_to_record).
//  The caller must:
//    1. ns_stack.push(ns_frame)           ← permanent push
//    2. for each (p,u) in emissions: ns_stack.record_emitted(p, u)
//    3. write canonical_bytes
// ─────────────────────────────────────────────────────────

fn canonicalize_start_tag(
    e: &BytesStart<'_>,
    ns_stack: &mut NsStack,
    inclusive_prefixes: &[&str],
) -> Result<(Vec<u8>, NsFrame, Vec<(String, String)>), String> {
    let local = String::from_utf8_lossy(e.name().local_name().as_ref()).to_string();
    let prefix = String::from_utf8_lossy(
        e.name().prefix().map(|p| p.as_ref()).unwrap_or(&[]),
    )
    .to_string();

    // Collect namespace declarations and content attributes from raw attrs
    let mut ns_declarations: HashMap<String, String> = HashMap::new();
    // Sort key: (resolved_ns_uri, local_name), value: (original_qname, normalised_value)
    let mut content_attrs: BTreeMap<(String, String), (String, String)> = BTreeMap::new();

    // First pass: collect ns declarations so we can resolve attr prefixes below
    let mut raw_attrs: Vec<(String, String)> = Vec::new();
    for attr_result in e.attributes() {
        let attr = attr_result.map_err(|err| format!("Attribute parse error: {err}"))?;
        let key = String::from_utf8_lossy(attr.key.as_ref()).to_string();
        let val = attr
            .unescape_value()
            .map_err(|err| format!("Attribute unescape error: {err}"))?
            .to_string();

        if key == "xmlns" {
            ns_declarations.insert(String::new(), val);
        } else if let Some(ns_prefix) = key.strip_prefix("xmlns:") {
            ns_declarations.insert(ns_prefix.to_string(), val);
        } else {
            raw_attrs.push((key, val));
        }
    }

    // Build this element's NsFrame
    let frame = NsFrame { declared: ns_declarations };

    // Temporarily push current frame so current_uri() resolves through it
    ns_stack.push(frame.clone());

    // Determine visibly-used prefixes
    let mut visibly_used: HashSet<String> = HashSet::new();
    // Element prefix — empty prefix means element is in the default namespace
    visibly_used.insert(prefix.clone()); // "" for no-prefix elements (default ns)

    // Second pass: classify content attributes using resolved namespace URIs
    for (key, val) in raw_attrs {
        let (sort_ns_uri, sort_local, orig_key) = if let Some(colon_pos) = key.find(':') {
            let attr_prefix = &key[..colon_pos];
            let attr_local = &key[colon_pos + 1..];
            let uri = ns_stack
                .current_uri(attr_prefix)
                .unwrap_or(attr_prefix) // fallback: use prefix as-is
                .to_string();
            visibly_used.insert(attr_prefix.to_string());
            (uri, attr_local.to_string(), key.clone())
        } else {
            // Attributes without prefix have NO namespace (not in default ns)
            (String::new(), key.clone(), key.clone())
        };
        content_attrs.insert(
            (sort_ns_uri, sort_local),
            (orig_key, normalize_attr_value(&val)),
        );
    }

    // Compute which namespace declarations to emit (stack has current frame pushed)
    let to_emit = ns_stack.declarations_to_emit(&visibly_used, inclusive_prefixes);

    // Pop the temporary push — caller does the permanent push
    ns_stack.pop();

    // Build canonical start-tag bytes
    let mut out = String::new();
    out.push('<');
    if prefix.is_empty() {
        out.push_str(&local);
    } else {
        out.push_str(&prefix);
        out.push(':');
        out.push_str(&local);
    }

    // Namespace declarations — sorted by prefix (W3C C14N § 2.3)
    let mut sorted_ns: Vec<(String, String)> = to_emit.clone();
    sorted_ns.sort_by(|a, b| a.0.cmp(&b.0));
    for (p, u) in &sorted_ns {
        if p.is_empty() {
            out.push_str(&format!(" xmlns=\"{}\"", u));
        } else {
            out.push_str(&format!(" xmlns:{}=\"{}\"", p, u));
        }
    }

    // Content attributes — BTreeMap is already sorted by (ns_uri, local_name)
    for ((_, _), (orig_key, val)) in &content_attrs {
        out.push_str(&format!(" {}=\"{}\"", orig_key, val));
    }

    out.push('>');
    Ok((out.into_bytes(), frame, to_emit))
}

// ─────────────────────────────────────────────────────────
//  Core C14N algorithm (streaming, without-comments profile)
// ─────────────────────────────────────────────────────────

fn build_end_tag(e_name: &quick_xml::name::QName<'_>) -> String {
    let local = String::from_utf8_lossy(e_name.local_name().as_ref()).to_string();
    let prefix = String::from_utf8_lossy(
        e_name.prefix().map(|p| p.as_ref()).unwrap_or(&[]),
    )
    .to_string();
    if prefix.is_empty() {
        format!("</{}>", local)
    } else {
        format!("</{}:{}>", prefix, local)
    }
}

fn c14n_exclusive_impl(
    xml_data: &[u8],
    inclusive_prefix_list: Option<&str>,
) -> Result<Vec<u8>, String> {
    let inclusive: Vec<&str> = inclusive_prefix_list
        .unwrap_or("")
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .collect();

    let mut reader = Reader::from_reader(Cursor::new(xml_data));
    reader.config_mut().trim_text(false);
    reader.config_mut().expand_empty_elements(false); // we handle expansion

    let mut output: Vec<u8> = Vec::new();
    let mut ns_stack = NsStack::new();
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let (bytes, frame, to_emit) =
                    canonicalize_start_tag(e, &mut ns_stack, &inclusive)?;

                // Permanent push, THEN record so depth is correct
                ns_stack.push(frame);
                for (p, u) in &to_emit {
                    ns_stack.record_emitted(p, u);
                }

                output.extend_from_slice(&bytes);
            }

            Ok(Event::Empty(ref e)) => {
                // Expand <elem/> → <elem></elem> per C14N
                let (bytes, frame, to_emit) =
                    canonicalize_start_tag(e, &mut ns_stack, &inclusive)?;

                ns_stack.push(frame);
                for (p, u) in &to_emit {
                    ns_stack.record_emitted(p, u);
                }

                output.extend_from_slice(&bytes);

                // Immediate end tag + retract + pop
                let end = build_end_tag(&e.name());
                output.extend_from_slice(end.as_bytes());

                let depth = ns_stack.depth();
                ns_stack.retract_emitted_at_depth(depth);
                ns_stack.pop();
            }

            Ok(Event::End(ref e)) => {
                let end = build_end_tag(&e.name());
                output.extend_from_slice(end.as_bytes());

                // Retract emissions recorded at THIS depth, then pop
                let depth = ns_stack.depth();
                ns_stack.retract_emitted_at_depth(depth);
                ns_stack.pop();
            }

            Ok(Event::Text(ref e)) => {
                let text = e.unescape().map_err(|err| format!("Text unescape: {err}"))?;
                output.extend_from_slice(normalize_text_node(&text).as_bytes());
            }

            Ok(Event::CData(ref e)) => {
                // CData → treated as character data in C14N
                let text = String::from_utf8_lossy(e.as_ref());
                output.extend_from_slice(normalize_text_node(&text).as_bytes());
            }

            // Comments, PIs, DOCTYPE, XML declaration — omitted in without-comments profile
            Ok(Event::Comment(_))
            | Ok(Event::PI(_))
            | Ok(Event::DocType(_))
            | Ok(Event::Decl(_)) => {}

            Ok(Event::Eof) => break,

            Err(err) => {
                return Err(format!(
                    "XML parse error at byte {}: {err}",
                    reader.error_position()
                ))
            }

            _ => {}
        }
        buf.clear();
    }

    Ok(output)
}

// ─────────────────────────────────────────────────────────
//  PyO3 interface
// ─────────────────────────────────────────────────────────

#[pyfunction]
#[pyo3(name = "c14n_exclusive")]
fn c14n_exclusive_py(
    xml_bytes: &[u8],
    inclusive_prefix_list: Option<&str>,
) -> PyResult<Vec<u8>> {
    if xml_bytes.is_empty() {
        return Err(PyValueError::new_err("Input XML bytes cannot be empty"));
    }
    c14n_exclusive_impl(xml_bytes, inclusive_prefix_list).map_err(PyValueError::new_err)
}

#[pyfunction]
fn is_available() -> bool {
    true
}

#[pyfunction]
fn version() -> &'static str {
    VERSION
}

#[pymodule]
fn xades_rust_core(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add("VERSION", VERSION)?;
    m.add_function(wrap_pyfunction!(c14n_exclusive_py, m)?)?;
    m.add_function(wrap_pyfunction!(is_available, m)?)?;
    m.add_function(wrap_pyfunction!(version, m)?)?;
    Ok(())
}

// ─────────────────────────────────────────────────────────
//  Unit tests — W3C correctness
// ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::c14n_exclusive_impl;

    fn c14n(xml: &str) -> String {
        let result = c14n_exclusive_impl(xml.as_bytes(), None).expect("c14n failed");
        String::from_utf8(result).expect("non-utf8 output")
    }

    fn c14n_inclusive(xml: &str, inclusive: &str) -> String {
        let result =
            c14n_exclusive_impl(xml.as_bytes(), Some(inclusive)).expect("c14n failed");
        String::from_utf8(result).expect("non-utf8 output")
    }

    // ── Bug fix 1: sibling namespace retraction ──────────────────────────────
    // After a child re-declares xmlns:a="B" and closes, the sibling must NOT
    // inherit the child's B — it should see the ancestor's A (and emit nothing
    // if the ancestor already emitted A, or re-emit A if the child changed it).
    #[test]
    fn test_sibling_namespace_retraction() {
        let xml = r#"<root xmlns:a="urn:A"><child xmlns:a="urn:B" a:x="1"></child><sibling a:y="2"></sibling></root>"#;
        let out = c14n(xml);
        // child must show xmlns:a="urn:B"
        assert!(out.contains(r#"<child xmlns:a="urn:B""#), "child should declare urn:B");
        // sibling must re-emit xmlns:a="urn:A" (because child changed it to urn:B)
        assert!(
            out.contains(r#"<sibling xmlns:a="urn:A""#),
            "sibling must restore urn:A but got: {out}"
        );
    }

    // ── Bug fix 2: attribute sort by resolved namespace URI ──────────────────
    // Two attributes with different prefixes mapping to same URI should sort
    // deterministically by the resolved URI, not by prefix string.
    #[test]
    fn test_attribute_sort_order() {
        // z:b comes before a:a alphabetically by prefix, but by URI:
        //   xmlns:a="urn:1", xmlns:z="urn:2" → sort by URI puts urn:1 < urn:2
        //   so a:a should appear before z:b in output
        let xml = r#"<r xmlns:a="urn:1" xmlns:z="urn:2"><e z:b="B" a:a="A"></e></r>"#;
        let out = c14n(xml);
        let pos_a = out.find("a:a").expect("a:a not found");
        let pos_z = out.find("z:b").expect("z:b not found");
        assert!(
            pos_a < pos_z,
            "a:a (urn:1) must precede z:b (urn:2); got: {out}"
        );
    }

    // ── Bug fix 3: default namespace propagation ─────────────────────────────
    #[test]
    fn test_default_namespace_emitted_for_unprefixed_element() {
        let xml = r#"<Invoice xmlns="urn:etda:etax:1.0"><Seller>Co A</Seller></Invoice>"#;
        let out = c14n(xml);
        // Root element must carry xmlns="urn:etda:etax:1.0"
        assert!(
            out.contains(r#"<Invoice xmlns="urn:etda:etax:1.0""#) || out.starts_with(r#"<Invoice xmlns="urn:etda:etax:1.0""#),
            "default ns must appear on root: {out}"
        );
        // Child in same default namespace must NOT repeat it (already emitted)
        let seller_start = out.find("<Seller").expect("<Seller not found");
        let seller_chunk = &out[seller_start..seller_start + 60];
        assert!(
            !seller_chunk.contains("xmlns="),
            "Seller should not re-declare default ns: {seller_chunk}"
        );
    }

    // ── Bug fix 4: unescape_value compatibility (compile + runtime) ──────────
    #[test]
    fn test_attribute_value_unescaping() {
        let xml = r#"<e a="A &amp; B &lt; C"></e>"#;
        let out = c14n(xml);
        // After c14n, & is re-escaped as &amp; and < as &lt;
        assert!(
            out.contains("A &amp; B &lt; C"),
            "attr value should be normalized: {out}"
        );
    }

    // ── Empty element expansion ──────────────────────────────────────────────
    #[test]
    fn test_empty_element_expansion() {
        let out = c14n(r#"<root><empty/></root>"#);
        assert_eq!(out, "<root><empty></empty></root>");
    }

    // ── Text node normalization ──────────────────────────────────────────────
    #[test]
    fn test_text_normalization() {
        let out = c14n("<r>a &amp; b &lt; c &gt; d</r>");
        assert!(out.contains("a &amp; b &lt; c &gt; d"), "got: {out}");
    }

    // ── XML declaration omitted ──────────────────────────────────────────────
    #[test]
    fn test_xml_declaration_omitted() {
        let out = c14n(r#"<?xml version="1.0"?><r></r>"#);
        assert!(!out.contains("<?xml"), "XML decl must be omitted: {out}");
    }

    // ── Comment omitted ──────────────────────────────────────────────────────
    #[test]
    fn test_comment_omitted() {
        let out = c14n("<r><!-- secret --><e></e></r>");
        assert!(!out.contains("secret"), "comment must be omitted: {out}");
    }

    // ── InclusiveNamespaces PrefixList ───────────────────────────────────────
    // In XAdES, C14N is applied to a subtree fragment, not the full document.
    // InclusiveNamespaces lets the caller "import" in-scope prefixes from
    // ancestors that fall OUTSIDE the fragment.
    // Test: a standalone fragment that declares xmlns:soap but does NOT use it.
    //   • Exclusive C14N → soap is omitted (not visibly used)
    //   • Exclusive C14N + InclusivePrefixList "soap" → soap is preserved
    #[test]
    fn test_inclusive_prefix_list_preserves_ns() {
        let fragment = r#"<inner xmlns:soap="urn:soap" xmlns:a="urn:A" a:x="1"></inner>"#;

        let out_excl = c14n(fragment);
        assert!(
            !out_excl.contains("soap"),
            "exclusive should omit unused soap prefix: {out_excl}"
        );

        let out_incl = c14n_inclusive(fragment, "soap");
        assert!(
            out_incl.contains(r#"xmlns:soap="urn:soap""#),
            "inclusive should carry soap: {out_incl}"
        );
    }

    // ── Redundant declaration suppression ────────────────────────────────────
    #[test]
    fn test_no_redundant_ns_on_child() {
        // Child is in the same namespace as parent; must not repeat the declaration.
        let xml = r#"<r xmlns:ds="urn:ds"><ds:Sig><ds:SV></ds:SV></ds:Sig></r>"#;
        let out = c14n(xml);
        // ds:Sig must declare xmlns:ds once; ds:SV must NOT repeat it
        let sig_pos  = out.find("<ds:Sig").unwrap();
        let sv_pos   = out.find("<ds:SV").unwrap();
        let sig_chunk = &out[sig_pos..sv_pos];
        let sv_chunk  = &out[sv_pos..sv_pos + 60.min(out.len() - sv_pos)];
        assert!(sig_chunk.contains("xmlns:ds"), "ds:Sig must declare xmlns:ds");
        assert!(!sv_chunk.contains("xmlns:ds"), "ds:SV must not repeat xmlns:ds: {sv_chunk}");
    }
}
