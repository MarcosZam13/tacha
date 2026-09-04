const HomePage = (): React.JSX.Element => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
    <h1 className="font-display text-3xl font-bold text-tacha-text">Tacha</h1>
    <p className="font-body text-tacha-textsec">
      Todavía no hay pantallas de producto en esta rama — ver{" "}
      <a href="/ui-kit" className="text-tacha-teal underline">
        /ui-kit
      </a>{" "}
      para los primitivos base de UI.
    </p>
  </main>
);

export default HomePage;
