import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative w-full min-h-screen flex justify-center items-center overflow-hidden bg-gradient-to-b from-[#0a0a14] via-[#1a1a2e] to-[#0a0a14]">
      {/* Background gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(55,66,250,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(255,71,87,0.1),transparent_50%)]" />
      
      <div className="relative z-10 text-center px-10 py-10 max-w-3xl">
        <h1 className="text-7xl font-black tracking-wider mb-4 bg-gradient-to-r from-white via-[#a8a8ff] to-white bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(100,100,255,0.5)]">
          Sterling Long
        </h1>
        <p className="text-2xl text-white/70 tracking-widest mb-8 uppercase">
          Developer & Game Creator
        </p>
        <p className="text-lg text-white/60 leading-relaxed mb-12 max-w-2xl mx-auto">
          Welcome to my personal space. I build games, web applications, and digital experiences.
        </p>
        <div className="flex gap-6 justify-center flex-wrap">
          <Link
            href="/arcade"
            className="text-lg font-bold tracking-widest px-16 py-5 bg-gradient-to-r from-[#ff4757] to-[#ff6b81] rounded-lg text-white no-underline transition-all duration-300 inline-block shadow-[0_10px_40px_rgba(255,71,87,0.4)] hover:bg-gradient-to-r hover:from-[#ff6b81] hover:to-[#ff4757] hover:-translate-y-1 hover:shadow-[0_15px_50px_rgba(255,71,87,0.5)]"
          >
            Enter Arcade
          </Link>
        </div>
      </div>
      
      {/* Floating hexagons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-6xl text-white/[0.03] animate-[float_20s_ease-in-out_infinite]"
            style={{
              animationDelay: `${i * 0.2}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            ⬡
          </div>
        ))}
      </div>
    </div>
  );
}
