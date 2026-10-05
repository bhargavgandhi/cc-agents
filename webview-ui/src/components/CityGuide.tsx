import { Button } from './ui/Button.js';

interface CityGuideProps {
  /** The saved layout was just replaced by the bundled city: say where the backup went. */
  showBackupNote: boolean;
  onDismiss: () => void;
}

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'Agents are people',
    body: 'Every Claude Code session becomes a character. While it works it sits at an umbrella table on a work island (Waterfront Lofts, Midtown Plaza) and its laptop lights up.',
  },
  {
    title: 'Done means downtime',
    body: 'When an agent finishes its turn it heads to the café, gym or arcade. A green check means it is waiting for you; amber dots mean it needs a permission.',
  },
  {
    title: 'Getting around',
    body: 'The bridge between the work islands is a bike lane and the river between the gym and the arcade is a ferry, so you will see agents cycle and row.',
  },
  {
    title: 'Click to follow',
    body: 'Click a character to follow it with the camera (in VS Code it also opens its terminal). Drag with the middle mouse button to pan, and use + / − to zoom.',
  },
  {
    title: 'Give each repo an island',
    body: 'Layout → Areas: assign a workspace folder to an island and that repo’s agents take its seats. Each area also has a type (work, leisure, bike lane, ferry) you can change there.',
  },
];

/** Welcome + how-to for Hudson Hex City. Opens once on its own; Settings → City Guide reopens it. */
export function CityGuide({ showBackupNote, onDismiss }: CityGuideProps) {
  return (
    <div
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-100 p-16"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-guide-title"
        className="pixel-panel py-20 px-28 max-w-2xl max-h-full overflow-y-auto leading-[1.3]"
        onClick={(e) => e.stopPropagation()}
      >
        <div id="city-guide-title" className="text-4xl mb-12 text-accent text-center">
          Welcome to Hudson Hex City
        </div>
        <ol className="m-0 mb-16 pl-0 list-none">
          {STEPS.map((step, i) => (
            <li key={step.title} className="mb-10">
              <div className="text-lg text-accent-bright">
                {i + 1}. {step.title}
              </div>
              <div className="text-base">{step.body}</div>
            </li>
          ))}
        </ol>
        {showBackupNote && (
          <p className="text-base m-0 mb-16 text-text-muted">
            Your previous layout was replaced, but not lost: a copy is saved in{' '}
            <span className="text-accent-bright">~/.pixel-agents/</span> as{' '}
            <span className="text-accent-bright">layout.backup-rev*.json</span>. Bring it back with
            Settings → Import Layout. The original office ships as{' '}
            <span className="text-accent-bright">assets/layouts/classic-office.json</span>.
          </p>
        )}
        <div className="text-center">
          <Button variant="accent" size="xl" onClick={onDismiss} autoFocus>
            Start exploring
          </Button>
        </div>
      </div>
    </div>
  );
}
