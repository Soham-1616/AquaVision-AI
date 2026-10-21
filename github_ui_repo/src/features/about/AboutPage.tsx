import React from 'react';
import {
  Info, Target, Lightbulb, Layers, BarChart3,
  ArrowDown, Camera, Sparkles, ScanSearch, Monitor,
  AlertTriangle, Rocket, BookOpen,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Info size={22} color="var(--color-teal-500)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>About AquaVision AI</h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
          Project overview, research objectives, methodology, and system architecture.
        </p>
      </div>

      {/* Project Title */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--color-ocean-800)' }}>
            AquaVision AI
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 600, marginInline: 'auto' }}>
            Intelligent Underwater Image Enhancement and Real-Time Marine Object Detection System
          </p>
          <div style={{ marginTop: 12 }}>
            <span className="badge badge-neutral" style={{ fontSize: 12 }}>
              Final-Year CSE Research Project
            </span>
          </div>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} /> Problem Statement
          </h2>
        </div>
        <div className="card-body" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
          <p>
            Underwater images commonly suffer from several degradation challenges that significantly impair
            both visual quality and the accuracy of computer vision tasks:
          </p>
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            <li><strong>Blue-green color casts</strong> due to wavelength-dependent light attenuation</li>
            <li><strong>Reduced contrast and visibility</strong> from absorption and scattering</li>
            <li><strong>Haze and light scattering</strong> caused by suspended particles</li>
            <li><strong>Uneven illumination</strong> at varying depths</li>
            <li><strong>Loss of fine details</strong> and texture degradation</li>
            <li><strong>Poor visibility</strong> of small or partially occluded marine objects</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            These challenges make it difficult for object detection models to reliably identify marine
            organisms in raw underwater imagery, motivating an integrated enhancement-plus-detection pipeline.
          </p>
        </div>
      </div>

      {/* Research Objectives */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={18} /> Research Objectives
          </h2>
        </div>
        <div className="card-body" style={{ fontSize: 14, lineHeight: 1.7 }}>
          <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, color: 'var(--color-text-secondary)' }}>
            <li>Develop an effective underwater image enhancement method to address color distortion, low contrast, and haze</li>
            <li>Implement a real-time marine object detection system using a lightweight, fine-tuned YOLO-family model</li>
            <li>Integrate enhancement and detection into a unified pipeline to evaluate whether image preprocessing improves detection accuracy</li>
            <li>Evaluate the system using established image quality and object detection metrics</li>
            <li>Provide a demonstration interface for visualization and analysis of results</li>
          </ol>
        </div>
      </div>

      {/* Methodology / Architecture Diagram */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} /> Proposed System Architecture
          </h2>
          <span className="badge badge-neutral" style={{ fontSize: 11 }}>Conceptual Pipeline</span>
        </div>
        <div className="card-body">
          <div style={{
            padding: '10px 14px', borderRadius: 6, background: '#FEF3C7',
            fontSize: 12, color: '#92400E', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertTriangle size={14} />
            This diagram represents the proposed project pipeline, not a deployed production architecture.
          </div>

          <div className="arch-flow">
            {/* Input */}
            <div className="arch-node input" style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
              <Camera size={18} />
              <span>Underwater Camera / Recorded Video Input</span>
            </div>
            <div className="arch-arrow"><ArrowDown size={20} /></div>

            <div className="arch-node input">
              Frame Acquisition & Input Preprocessing
            </div>
            <div className="arch-arrow"><ArrowDown size={20} /></div>

            {/* Enhancement */}
            <div className="arch-node process" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <Sparkles size={18} />
                <strong>Underwater Image Enhancement</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Color-cast correction</span>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Contrast enhancement</span>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Dehazing</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Classical fallback: White Balance, CLAHE
              </div>
            </div>
            <div className="arch-arrow"><ArrowDown size={20} /></div>

            <div className="arch-node" style={{ background: '#DCFCE7', border: '1px solid #86EFAC', color: '#166534' }}>
              Enhanced Underwater Frame
            </div>
            <div className="arch-arrow"><ArrowDown size={20} /></div>

            {/* Detection */}
            <div className="arch-node process" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <ScanSearch size={18} />
                <strong>Real-Time Marine Object Detection</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Lightweight YOLO-family detector</span>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Marine object classes</span>
              </div>
            </div>
            <div className="arch-arrow"><ArrowDown size={20} /></div>

            {/* Output */}
            <div className="arch-node output" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <Monitor size={18} />
                <strong>Annotated Output & Demonstration Interface</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Bounding boxes</span>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Class labels</span>
                <span className="badge badge-neutral" style={{ fontSize: 11 }}>Confidence scores</span>
              </div>
            </div>
          </div>

          {/* Evaluation branches */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 16, borderRadius: 8, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={14} /> Enhancement Evaluation
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {['PSNR', 'SSIM', 'UIQM', 'UCIQE'].map((m) => (
                  <span key={m} className="badge badge-neutral" style={{ fontSize: 11 }}>{m}</span>
                ))}
              </div>
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={14} /> Detection Evaluation
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {['Precision', 'Recall', 'F1', 'mAP', 'FPS'].map((m) => (
                  <span key={m} className="badge badge-neutral" style={{ fontSize: 11 }}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applications */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Rocket size={18} /> Intended Applications
          </h2>
        </div>
        <div className="card-body" style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              'Marine biodiversity monitoring',
              'Coral reef health assessment',
              'Underwater archaeology surveys',
              'Environmental impact analysis',
              'Aquaculture management',
              'Underwater robot navigation',
            ].map((app) => (
              <div key={app} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--color-surface-50)', border: '1px solid var(--color-surface-200)', fontSize: 13 }}>
                {app}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Limitations & Future Scope */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Known Limitations</h2>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Performance depends on training data diversity</li>
              <li>Extreme turbidity may exceed enhancement capabilities</li>
              <li>Real-time processing constrained by hardware resources</li>
              <li>Marine class coverage limited to training dataset</li>
              <li>Live camera streaming not yet implemented</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={18} /> Future Scope
            </h2>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Multi-model ensemble for improved accuracy</li>
              <li>Edge deployment for underwater ROVs</li>
              <li>Temporal tracking across video frames</li>
              <li>Domain adaptation for diverse water conditions</li>
              <li>Integration with marine biological databases</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
