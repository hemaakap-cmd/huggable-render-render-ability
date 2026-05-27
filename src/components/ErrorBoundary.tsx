import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Localized messages keyed by html lang attribute
const MESSAGES: Record<string, { title: string; subtitle: string; retry: string; home: string; dir: "ltr" | "rtl" }> = {
  de: {
    title: "Ein unerwarteter Fehler ist aufgetreten",
    subtitle: "Bitte lade die Seite neu oder kehre zur Startseite zurück.",
    retry: "Erneut versuchen",
    home: "Startseite",
    dir: "ltr",
  },
  en: {
    title: "Something went wrong",
    subtitle: "Please reload the page or return to the home page.",
    retry: "Try again",
    home: "Home",
    dir: "ltr",
  },
  fr: {
    title: "Une erreur inattendue s'est produite",
    subtitle: "Veuillez recharger la page ou revenir à l'accueil.",
    retry: "Réessayer",
    home: "Accueil",
    dir: "ltr",
  },
  es: {
    title: "Ha ocurrido un error inesperado",
    subtitle: "Por favor, recarga la página o vuelve al inicio.",
    retry: "Reintentar",
    home: "Inicio",
    dir: "ltr",
  },
  nl: {
    title: "Er is een onverwachte fout opgetreden",
    subtitle: "Laad de pagina opnieuw of ga terug naar de startpagina.",
    retry: "Opnieuw proberen",
    home: "Home",
    dir: "ltr",
  },
};

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    window.location.replace("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const lang = (typeof document !== "undefined" && document.documentElement.lang) || "de";
    const m = MESSAGES[lang] || MESSAGES.de;

    return (
      <div
        dir={m.dir}
        className="min-h-screen flex items-center justify-center bg-background px-4"
      >
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{m.title}</h1>
            <p className="text-muted-foreground text-sm">{m.subtitle}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={this.handleRetry} variant="default" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              {m.retry}
            </Button>
            <Button onClick={this.handleHome} variant="outline" className="gap-2">
              <Home className="w-4 h-4" />
              {m.home}
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 text-xs text-left bg-muted p-3 rounded overflow-auto max-h-40 text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
