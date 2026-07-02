import Image from "next/image";

type AppLoadingScreenProps = {
  title: string;
  message: string;
};

export function AppLoadingScreen({ title, message }: AppLoadingScreenProps) {
  return (
    <main className="app-loading-screen">
      <Image className="orisus-wordmark" src="/orisus-zahnmedizin-transparent.png" alt="Orisus Zahnmedizin" width={1859} height={557} priority />
      <div>
        <span className="eyebrow">Orisus BFS Monitor</span>
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </main>
  );
}
