'use client';

import { useEffect, useRef } from 'react';
import {
  IconMessageCircle,
  IconClock,
  IconUser,
  IconBooks,
  IconFeather,
  IconArrowsRightLeft,
  IconTag,
  IconLink,
} from '@tabler/icons-react';

const journeyItems = [
  { q: 'What does this verse mean?', Icon: IconMessageCircle },
  { q: 'Why was it revealed?', Icon: IconClock },
  { q: 'What did the scholars say?', Icon: IconUser },
  { q: 'What tafsir is available?', Icon: IconBooks },
  { q: 'What hadith relate to it?', Icon: IconFeather },
  { q: "How is it recited in different qira'at?", Icon: IconArrowsRightLeft },
  { q: 'What do these Quranic symbols mean?', Icon: IconTag },
  { q: 'What other verses discuss this topic?', Icon: IconLink },
];

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = containerRef.current?.querySelectorAll('.fade-in');
    elements?.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('show');
      }, 60 + i * 50);
    });
  }, []);

  return (
    <>
      <style>{`
        .fade-in {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .fade-in.show {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <div ref={containerRef} style={{ padding: '2.5rem 3.5rem', maxWidth: '780px', fontFamily: 'Inter, sans-serif', fontSize: '18px', color: '#1a1a18' }}>

        {/* Hero */}
        <div className="fade-in" style={{ fontSize: '0.86rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2a5c45', fontWeight: 500, marginBottom: '0.5rem' }}>AyahFind</div>
        <h1 className="fade-in" style={{ fontFamily: 'Lora, serif', fontSize: '2.65rem', fontWeight: 400, lineHeight: 1.2, color: '#1a1a18', marginBottom: '0.75rem' }}>
          Islamic knowledge should be <em style={{ fontStyle: 'italic', color: '#2a5c45' }}>easy to find.</em>
        </h1>
        <p className="fade-in" style={{ fontSize: '1.13rem', color: '#6a6a60', lineHeight: 1.75, maxWidth: '480px', marginBottom: '2rem' }}>
          The knowledge exists. The problem is that it is scattered. AyahFind brings authentic Islamic sources together — so Muslims can retrieve, understand, and explore from one trusted place.
        </p>

        <div className="fade-in" style={{ height: '1px', background: '#e8e8e4', margin: '2rem 0' }} />

        {/* The Problem */}
        <div className="fade-in" style={{ fontSize: '0.83rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9a90', fontWeight: 500, marginBottom: '0.5rem' }}>The problem</div>
        <h2 className="fade-in" style={{ fontFamily: 'Lora, serif', fontSize: '1.78rem', fontWeight: 400, lineHeight: 1.3, color: '#1a1a18', marginBottom: '0.65rem' }}>
          Islamic knowledge exists.<br /><em style={{ fontStyle: 'italic', color: '#2a5c45' }}>But it is hard to reach.</em>
        </h2>
        <p className="fade-in" style={{ fontSize: '1.09rem', color: '#5a5a52', lineHeight: 1.8, maxWidth: '500px' }}>
          A Muslim who wants to learn often has to search across many different websites. The knowledge exists — but it is spread across the internet, with no guarantee the sources are authentic.
        </p>

        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
          {[
            { label: 'To find an ayah', val: 'One website' },
            { label: 'To read tafsir', val: 'Another website' },
            { label: 'Why it was revealed', val: 'Somewhere else' },
            { label: "To compare qira'at", val: 'Multiple sources' },
            { label: 'Related hadith', val: 'Multiple collections' },
          ].map((tile) => (
            <div key={tile.label} style={{ background: '#fff', border: '1px solid #e8e8e4', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
              <div style={{ fontSize: '0.95rem', color: '#3a3a32', fontWeight: 500, marginBottom: '0.2rem' }}>{tile.label}</div>
              <div style={{ fontSize: '0.95rem', color: '#9a9a90' }}>→ {tile.val}</div>
            </div>
          ))}
        </div>

        <div className="fade-in" style={{ marginTop: '1rem', padding: '0.9rem 1.1rem', background: '#f0f7f4', borderLeft: '2px solid #2a5c45', borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: '1.13rem', fontStyle: 'italic', color: '#2a5c45', lineHeight: 1.65 }}>
            AyahFind exists to bring authentic Islamic knowledge together and make it accessible through retrieval.
          </p>
        </div>

        <div className="fade-in" style={{ height: '1px', background: '#e8e8e4', margin: '2rem 0' }} />

        {/* Where it started */}
        <div className="fade-in" style={{ fontSize: '0.83rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9a90', fontWeight: 500, marginBottom: '0.5rem' }}>Where it started</div>
        <h2 className="fade-in" style={{ fontFamily: 'Lora, serif', fontSize: '1.78rem', fontWeight: 400, lineHeight: 1.3, color: '#1a1a18', marginBottom: '0.65rem' }}>
          Built for <em style={{ fontStyle: 'italic', color: '#2a5c45' }}>imperfect memory.</em>
        </h2>
        <p className="fade-in" style={{ fontSize: '1.09rem', color: '#5a5a52', lineHeight: 1.8, maxWidth: '500px' }}>
          The original problem AyahFind solved was helping users find forgotten ayahs from imperfect memory. You remember a feeling, a fragment, a sound — not the exact words. That remains important. But it is only the beginning.
        </p>
        <div className="fade-in" style={{ fontSize: '1.59rem', color: '#2a5c45', direction: 'rtl', textAlign: 'right', lineHeight: 2, fontFamily: 'Lora, serif', margin: '1rem 0 0.15rem' }}>
          لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا
        </div>
        <p className="fade-in" style={{ fontSize: '0.92rem', color: '#aaa', textAlign: 'right' }}>Found by searching: &quot;Allah does not burden&quot; · Al-Baqarah 2:286</p>

        <div className="fade-in" style={{ height: '1px', background: '#e8e8e4', margin: '2rem 0' }} />

        {/* The Journey */}
        <div className="fade-in" style={{ fontSize: '0.83rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9a90', fontWeight: 500, marginBottom: '0.5rem' }}>The journey</div>
        <h2 className="fade-in" style={{ fontFamily: 'Lora, serif', fontSize: '1.78rem', fontWeight: 400, lineHeight: 1.3, color: '#1a1a18', marginBottom: '0.65rem' }}>
          Finding the ayah is <em style={{ fontStyle: 'italic', color: '#2a5c45' }}>the starting point.</em>
        </h2>
        <p className="fade-in" style={{ fontSize: '1.09rem', color: '#5a5a52', lineHeight: 1.8, maxWidth: '500px' }}>
          After finding a verse, a user should be able to keep learning — without leaving the platform.
        </p>

        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '1rem' }}>
          {journeyItems.map(({ q, Icon }) => (
            <div key={q} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', background: '#fff', border: '1px solid #e8e8e4', borderRadius: '7px', fontSize: '1.03rem', color: '#3a3a32' }}>
              <Icon size={20} color="#2a5c45" style={{ flexShrink: 0 }} />
              {q}
            </div>
          ))}
        </div>

        <p className="fade-in" style={{ fontSize: '1.09rem', color: '#5a5a52', lineHeight: 1.8, marginTop: '0.9rem' }}>All of these answers — from one place.</p>

        <div className="fade-in" style={{ height: '1px', background: '#e8e8e4', margin: '2rem 0' }} />

        {/* Principles */}
        <div className="fade-in" style={{ fontSize: '0.83rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9a90', fontWeight: 500, marginBottom: '0.5rem' }}>Our principles</div>
        <h2 className="fade-in" style={{ fontFamily: 'Lora, serif', fontSize: '1.78rem', fontWeight: 400, lineHeight: 1.3, color: '#1a1a18', marginBottom: '0.65rem' }}>
          Authentic. <em style={{ fontStyle: 'italic', color: '#2a5c45' }}>Always traceable.</em>
        </h2>

        <div className="fade-in">
          {[
            { title: 'Authenticity above everything', desc: 'Users should not have to worry whether the information is genuine. Every result traces back to an authentic Islamic source.' },
            { title: 'Sources always visible', desc: 'References are always clear. Knowledge is always traceable. Nothing is presented without attribution.' },
            { title: 'Retrieval, not generation', desc: 'AyahFind never generates Islamic content. AI is used only to improve retrieval. The scholarship belongs to the scholars.' },
          ].map((p, i, arr) => (
            <div key={p.title} style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', padding: '0.85rem 0', borderBottom: i < arr.length - 1 ? '1px solid #f0f0ec' : 'none' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f0f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2a5c45', fontSize: '1.06rem', flexShrink: 0, marginTop: '1px' }}>✓</div>
              <div>
                <div style={{ fontSize: '1.06rem', fontWeight: 500, color: '#1a1a18', marginBottom: '0.15rem' }}>{p.title}</div>
                <div style={{ fontSize: '1.0rem', color: '#7a7a70', lineHeight: 1.6 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="fade-in" style={{ height: '1px', background: '#e8e8e4', margin: '2rem 0' }} />

        {/* Mission */}
        <div className="fade-in" style={{ fontSize: '0.83rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9a90', fontWeight: 500, marginBottom: '0.5rem' }}>The mission</div>
        <h2 className="fade-in" style={{ fontFamily: 'Lora, serif', fontSize: '1.78rem', fontWeight: 400, lineHeight: 1.3, color: '#1a1a18', marginBottom: '0.65rem' }}>
          Learning about Islam <em style={{ fontStyle: 'italic', color: '#2a5c45' }}>should be easier.</em>
        </h2>

        <div className="fade-in" style={{ background: '#2a5c45', borderRadius: '10px', padding: '1.3rem 1.5rem', marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'Lora, serif', fontSize: '1.18rem', fontStyle: 'italic', color: '#c8e6d8', lineHeight: 1.75 }}>
            The mission is to help Muslims retrieve, connect, and explore the knowledge of their religion from one trusted place.
          </p>
          <span style={{ display: 'block', marginTop: '0.65rem', fontSize: '0.98rem', color: '#6aaa88' }}>
            Finding Islamic knowledge should be easier. Accessing authentic sources should be easier.
          </span>
        </div>

      </div>
    </>
  );
}
