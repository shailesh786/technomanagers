import { Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuestionAccess } from '@/contexts/QuestionAccessContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SignInGateModal() {
  const { gateOpen, setGateOpen } = useQuestionAccess();
  const { signInWithGoogle } = useAuth();

  return (
    <Dialog open={gateOpen} onOpenChange={setGateOpen}>
      <DialogContent className="max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-heading">Sign in to unlock all answers</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            You've viewed your 2 free answers. Sign in with Google to get unlimited access to all questions and answers.
          </DialogDescription>
        </DialogHeader>

        <button
          onClick={() => signInWithGoogle()}
          className="mx-auto mt-4 flex items-center gap-3 rounded-lg border bg-background px-6 py-2.5 font-medium shadow-sm transition-colors hover:bg-muted"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Sign in with Google
        </button>

        <button
          onClick={() => setGateOpen(false)}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Maybe later
        </button>
      </DialogContent>
    </Dialog>
  );
}
