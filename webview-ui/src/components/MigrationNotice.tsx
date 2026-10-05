import { Button } from './ui/Button.js';

interface MigrationNoticeProps {
  onDismiss: () => void;
}

export function MigrationNotice({ onDismiss }: MigrationNoticeProps) {
  return (
    <div
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-100"
      onClick={onDismiss}
    >
      <div
        className="pixel-panel py-24 px-32 max-w-xl text-center leading-[1.3]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-12 text-accent">Welcome to Hudson Hex City</div>
        <p className="text-xl m-0 mb-12">
          The office is now a miniature city on the Hudson. Agents work at the plaza tables and head
          to the café, gym or arcade when they finish, riding the bridge by bike or the ferry by
          boat.
        </p>
        <p className="text-xl m-0 mb-12">
          Your previous layout was replaced, but not lost: a copy is saved in{' '}
          <span className="text-accent-bright">~/.pixel-agents/</span> as{' '}
          <span className="text-accent-bright">layout.backup-rev*.json</span>. Bring it back with
          Settings → Import Layout.
        </p>
        <p className="text-xl m-0 mb-20">
          The original office ships as{' '}
          <span className="text-accent-bright">assets/layouts/classic-office.json</span>.
        </p>
        <Button variant="accent" size="xl" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
