import Image from "next/image";

/**
 * Hero illustration: a real MacBook Pro frame (public/frames) with a
 * lightweight HTML mock of the Shotlark editor inside its screen opening.
 * Screen opening from public/frames/macbook-pro-14.json:
 * x 400, y 300, w 3024, h 1964 on a 3824 x 2564 frame.
 */
export function ProductShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-5xl" aria-hidden>
      <div
        className="pointer-events-none absolute inset-x-[8%] top-[10%] bottom-[2%] -z-10 rounded-[40%] bg-[radial-gradient(closest-side,rgba(102,80,216,0.35),transparent)] blur-3xl"
      />
      <div className="relative aspect-[3824/2564] w-full">
        <div
          className="@container absolute overflow-hidden bg-[#0e0c14]"
          style={{
            left: "10.46%",
            top: "11.7%",
            width: "79.08%",
            height: "76.6%",
          }}
        >
          <EditorMock />
        </div>
        <Image
          src="/frames/macbook-pro-14.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="pointer-events-none select-none object-contain"
        />
      </div>
    </div>
  );
}

function EditorMock() {
  return (
    <div className="flex h-full w-full flex-col text-white">
      {/* top bar */}
      <div className="flex h-[7%] items-center gap-[1.2%] border-b border-white/10 px-[2%]">
        <span className="size-[1.6cqw] min-h-1.5 min-w-1.5 rounded-full bg-[#b4a6f4]" />
        <span className="h-[28%] w-[9%] rounded-full bg-white/20" />
        <span className="ml-auto h-[40%] w-[8%] rounded-full bg-[#b4a6f4]" />
      </div>
      <div className="flex min-h-0 flex-1">
        {/* tool rail */}
        <div className="flex w-[5%] flex-col items-center gap-[6%] border-r border-white/10 pt-[2%]">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={`aspect-square w-[46%] rounded-md ${index === 1 ? "bg-[#6650d8]" : "bg-white/12"}`}
            />
          ))}
        </div>
        {/* canvas */}
        <div className="relative flex flex-1 items-center justify-center p-[3.5%]">
          <div className="relative flex aspect-[16/10] w-full max-w-[92%] items-center justify-center overflow-hidden rounded-[2%] bg-[radial-gradient(120%_90%_at_10%_10%,#b4a6f4_0%,transparent_55%),radial-gradient(90%_90%_at_90%_20%,#ff9ec7_0%,transparent_50%),radial-gradient(120%_100%_at_50%_100%,#6650d8_0%,#2a1f63_70%)] shadow-2xl">
            {/* beautified screenshot window */}
            <div className="flex w-[72%] flex-col overflow-hidden rounded-[3%] bg-white shadow-[0_30px_60px_-20px_rgba(20,10,60,0.6)]">
              <div className="flex h-[1.4cqw] min-h-2 items-center gap-[1%] bg-[#f3f1f8] px-[2%]">
                <span className="size-[0.5cqw] min-h-1 min-w-1 rounded-full bg-[#ff5f57]" />
                <span className="size-[0.5cqw] min-h-1 min-w-1 rounded-full bg-[#febc2e]" />
                <span className="size-[0.5cqw] min-h-1 min-w-1 rounded-full bg-[#28c840]" />
              </div>
              <div className="grid grid-cols-[1fr_1.4fr] gap-[4%] p-[5%]">
                <div className="space-y-[10%]">
                  <span className="block h-[0.9cqw] min-h-1.5 w-[80%] rounded-full bg-[#242334]" />
                  <span className="block h-[0.5cqw] min-h-1 w-full rounded-full bg-[#ded8eb]" />
                  <span className="block h-[0.5cqw] min-h-1 w-[70%] rounded-full bg-[#ded8eb]" />
                  <span className="block h-[1.2cqw] min-h-2 w-[45%] rounded-full bg-[#6650d8]" />
                </div>
                <div className="flex items-end gap-[6%] rounded-[6%] bg-[#f0ecfc] p-[6%]">
                  {[40, 65, 50, 85, 70].map((height, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-t-sm bg-[#b4a6f4]"
                      style={{ height: `${height}%`, minHeight: 6 }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <span className="absolute right-[3%] bottom-[4%] flex items-center gap-[0.4cqw] rounded-full bg-black/40 px-[1%] py-[0.5%] text-[0.9cqw] font-semibold">
              <Image src="/logos/shotlark-flight.svg" alt="" width={12} height={12} className="size-[1cqw] min-h-2 min-w-2 rounded-full bg-[#f0ecfc]" />
              Shotlark
            </span>
          </div>
        </div>
        {/* post panel */}
        <div className="flex w-[24%] flex-col gap-[3%] border-l border-white/10 p-[2%]">
          <span className="h-[2%] w-[45%] rounded-full bg-white/25" />
          <div className="space-y-[6%] rounded-lg bg-white/[0.06] p-[8%]">
            <span className="block h-1 w-full rounded-full bg-white/40" />
            <span className="block h-1 w-[90%] rounded-full bg-white/40" />
            <span className="block h-1 w-[75%] rounded-full bg-white/40" />
            <span className="block h-1 w-[40%] rounded-full bg-[#b4a6f4]" />
          </div>
          <div className="flex flex-wrap gap-[4%]">
            {["w-[30%]", "w-[40%]", "w-[26%]"].map((width, index) => (
              <span key={index} className={`h-2 ${width} rounded-full bg-white/15`} />
            ))}
          </div>
          <span className="mt-auto h-[6%] w-full rounded-md bg-[#b4a6f4]" />
        </div>
      </div>
    </div>
  );
}
