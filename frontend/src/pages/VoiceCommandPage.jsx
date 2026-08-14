import { useEffect } from 'react';
import VoiceCommander from '../components/VoiceCommander';

export default function VoiceCommandPage() {
  useEffect(() => { document.title = 'สั่งงานด้วยเสียง — Openthai.ai'; }, []);
  return <VoiceCommander mode="page" />;
}
