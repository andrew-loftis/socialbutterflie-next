"use client";

import { useEffect, useMemo, useState } from 'react';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useAppState } from '@/components/shell/app-state';
import { firebaseStorage } from '@/lib/firebase/client';
import { updateCompany } from '@/lib/firebase/company-store';

type IntakeStep = {
  key: string;
  title: string;
  questions: string[];
};

const STEPS: IntakeStep[] = [
  {
    key: 'identity',
    title: 'Brand Identity',
    questions: [
      'What is the exact legal and public-facing brand name?',
      'What is your short tagline?',
      'What mission statement should appear in content?',
      'What mascot or icon should repeat in brand visuals?',
      'Which 3 words best describe the brand personality?',
      'What are your non-negotiable logo usage rules?',
      'List your primary and secondary colors.',
      'What legacy branding should be avoided?',
      'Who are your direct brand competitors?',
      'What makes this brand unmistakably yours?',
    ],
  },
  {
    key: 'voice',
    title: 'Voice and Messaging',
    questions: [
      'Describe your brand voice in one paragraph.',
      'What tone should captions always use?',
      'What phrases should never appear?',
      'What CTA style converts best for your audience?',
      'Give three sample posts that feel perfect.',
      'Give three sample posts that feel off-brand.',
      'How direct or playful should language be?',
      'How technical should copy be?',
      'What credibility markers should be emphasized?',
      'How should objections be handled in messaging?',
    ],
  },
  {
    key: 'visual',
    title: 'Visual Direction',
    questions: [
      'What visual styles should repeat every week?',
      'What visual styles should be avoided?',
      'What camera/framing preferences define your look?',
      'What typography style best matches your brand?',
      'What mood should your content evoke?',
      'Which references or creators represent your ideal aesthetic?',
      'How minimal or dense should layouts feel?',
      'What texture/lighting preferences should AI prioritize?',
      'What ratio/crop constraints matter most?',
      'What recurring motifs should be visible?',
    ],
  },
  {
    key: 'audience',
    title: 'Audience and Positioning',
    questions: [
      'Who is your primary audience persona?',
      'What geographies matter first?',
      'What core audience objections are common?',
      'What transformation do you promise to audience?',
      'What trust signals matter most for conversion?',
      'What audience segment should be excluded?',
      'Which channels generate best audience quality?',
      'How should messaging differ by platform?',
      'What urgency triggers are acceptable?',
      'What perception should audience have after 30 days?',
    ],
  },
  {
    key: 'content',
    title: 'Content Strategy',
    questions: [
      'List top 5 content pillars.',
      'What weekly cadence is realistic?',
      'Which formats perform best currently?',
      'What content goals are highest priority?',
      'What topics are prohibited?',
      'What recurring campaign themes should repeat?',
      'How should seasonal campaigns be handled?',
      'What metrics define content success?',
      'How should community interaction be reflected in posts?',
      'What is your approval policy before publishing?',
    ],
  },
  {
    key: 'uploads',
    title: 'Asset Uploads',
    questions: [
      'Upload logos (transparent preferred).',
      'Upload mascots/icons.',
      'Upload banner assets.',
      'Upload recurring visual references.',
      'Upload brand style guides if available.',
    ],
  },
  {
    key: 'ai',
    title: 'AI Prompt Context',
    questions: [
      'What should AI always remember before generating?',
      'What should AI never generate?',
      'What visual keywords should carry highest weight?',
      'What voice constraints are mandatory?',
      'What default negative prompt should be applied?',
      'What model parameters should default in studio?',
      'How strict should brand enforcement be?',
      'Should human names/faces be used? Under what constraints?',
      'What legal/compliance boundaries are required?',
      'What fallback style should AI use when uncertain?',
    ],
  },
  {
    key: 'review',
    title: 'Review and Confirm',
    questions: [
      'Confirm final summary and approve profile activation.',
    ],
  },
];

function storageKey(companyId: string) {
  return `intake:${companyId}`;
}

export function IntakeWizard({ companyId }: { companyId: string }) {
  const { appContext } = useAppState();
  const [initialState] = useState(() => {
    if (typeof window === 'undefined') {
      return { stepIndex: 0, answers: {} as Record<string, string>, uploadLog: [] as string[] };
    }
    const raw = localStorage.getItem(storageKey(companyId));
    if (!raw) {
      return { stepIndex: 0, answers: {} as Record<string, string>, uploadLog: [] as string[] };
    }
    try {
      const parsed = JSON.parse(raw) as { stepIndex: number; answers: Record<string, string>; uploadLog: string[] };
      return {
        stepIndex: parsed.stepIndex || 0,
        answers: parsed.answers || {},
        uploadLog: parsed.uploadLog || [],
      };
    } catch {
      return { stepIndex: 0, answers: {} as Record<string, string>, uploadLog: [] as string[] };
    }
  });
  const [stepIndex, setStepIndex] = useState(initialState.stepIndex);
  const [answers, setAnswers] = useState<Record<string, string>>(initialState.answers);
  const [uploadLog, setUploadLog] = useState<string[]>(initialState.uploadLog);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const step = STEPS[stepIndex];
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  useEffect(() => {
    localStorage.setItem(storageKey(companyId), JSON.stringify({ stepIndex, answers, uploadLog }));
  }, [answers, companyId, stepIndex, uploadLog]);

  const promptKeys = useMemo(() => {
    return step.questions.map((_, idx) => `${step.key}:${idx}`);
  }, [step.key, step.questions]);

  async function onUpload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    for (const file of list) {
      if (!firebaseStorage) {
        setUploadLog((prev) => [`[local] ${file.name}`, ...prev]);
        continue;
      }

      const path = `workspaces/${appContext.workspaceId}/companies/${companyId}/references/${Date.now()}-${file.name}`;
      const fileRef = ref(firebaseStorage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(fileRef, file);
        task.on(
          'state_changed',
          () => undefined,
          reject,
          async () => {
            const url = await getDownloadURL(task.snapshot.ref);
            setUploadLog((prev) => [`${file.name} -> ${url}`, ...prev]);
            resolve();
          }
        );
      });
    }
  }

  async function saveProgress() {
    setStatus('Saving...');
    const payload = {
      companyId,
      step: stepIndex,
      progress,
      payload: answers,
      uploaded: uploadLog,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateCompany(appContext.workspaceId, companyId, {
        aiContextCompiled: JSON.stringify(payload),
        completionScore: Math.max(progress, 10),
      });
      setStatus('Progress saved.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Save failed');
    }
  }

  return (
    <section className="panel">
      <div className="wizard-top">
        <h3>{step.title}</h3>
        <span className="badge">{progress}% complete</span>
      </div>

      <div className="wizard-steps">
        {STEPS.map((s, idx) => (
          <button
            key={s.key}
            type="button"
            className={`wizard-step ${idx === stepIndex ? 'active' : ''}`}
            onClick={() => setStepIndex(idx)}
          >
            <span>{idx + 1}</span>
            <p>{s.title}</p>
          </button>
        ))}
      </div>

      <div className="form-grid">
        {step.questions.map((question, idx) => {
          const key = promptKeys[idx];
          return (
            <label key={key}>
              <span>{question}</span>
              <textarea
                value={answers[key] || ''}
                onChange={(event) => setAnswers((prev) => ({ ...prev, [key]: event.target.value }))}
                placeholder="Paste optimized business context, prompts, references, and constraints..."
              />
            </label>
          );
        })}

        <label
          className={`upload-zone ${dragging ? 'upload-zone-active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void onUpload(event.dataTransfer.files);
          }}
        >
          <span>Drag and drop logos, mascots, banners, references</span>
          <div>or click below to upload files into Firebase Storage</div>
          <input type="file" multiple onChange={(event) => event.target.files && void onUpload(event.target.files)} />
        </label>

        {uploadLog.length ? (
          <div className="panel">
            <h3>Uploaded Assets</h3>
            <ul className="list-disc pl-5 text-sm text-[var(--muted)]">
              {uploadLog.slice(0, 8).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="button-row">
        <button className="btn-ghost" type="button" onClick={() => setStepIndex((v) => Math.max(v - 1, 0))}>Back</button>
        <button className="btn-ghost" type="button" onClick={() => void saveProgress()}>Save Progress</button>
        <button className="btn-primary" type="button" onClick={() => setStepIndex((v) => Math.min(v + 1, STEPS.length - 1))}>Next</button>
      </div>

      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </section>
  );
}
