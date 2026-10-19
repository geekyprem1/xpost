/**
 * Lightweight HTML stand-ins for a user's screenshot, used in marketing
 * previews. Sized with container query units so they scale with any card.
 * Purely decorative: callers render them inside an aria-hidden preview.
 */

const BARS = [42, 64, 50, 78, 58, 88, 70];

export function DesktopMock() {
  return (
    <div className="@container size-full overflow-hidden bg-[#fbfaff] text-[#242334]">
      <div className="flex size-full">
        <aside className="flex w-[17%] flex-col gap-[3cqw] border-r border-[#ece8f6] bg-white px-[2cqw] py-[3cqw]">
          <div className="flex items-center gap-[1cqw]">
            <span className="size-[3cqw] rounded-[0.8cqw] bg-[#6650d8]" />
            <span className="h-[1.2cqw] w-[7cqw] rounded-full bg-[#242334]" />
          </div>
          {[1, 0, 0, 0, 0].map((active, index) => (
            <span
              key={index}
              className={`h-[2.6cqw] rounded-[0.8cqw] ${active ? "bg-[#f0ecfc]" : ""} flex items-center gap-[1cqw] px-[1cqw]`}
            >
              <span
                className={`size-[1.4cqw] rounded-[0.4cqw] ${active ? "bg-[#6650d8]" : "bg-[#d9d4e6]"}`}
              />
              <span
                className={`h-[0.9cqw] rounded-full ${active ? "w-[6cqw] bg-[#6650d8]" : "w-[5cqw] bg-[#e3dfee]"}`}
              />
            </span>
          ))}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-[2.4cqw] p-[3cqw]">
          <div className="flex items-center justify-between">
            <div className="space-y-[0.8cqw]">
              <span className="block h-[1.8cqw] w-[18cqw] rounded-full bg-[#242334]" />
              <span className="block h-[1cqw] w-[26cqw] rounded-full bg-[#dcd6ea]" />
            </div>
            <span className="h-[3.4cqw] w-[11cqw] rounded-full bg-[#6650d8]" />
          </div>
          <div className="grid grid-cols-3 gap-[2cqw]">
            {["#6650d8", "#ff7ac3", "#2ec5a0"].map((color) => (
              <div
                key={color}
                className="space-y-[1.2cqw] rounded-[1.6cqw] border border-[#ece8f6] bg-white p-[2cqw]"
              >
                <span className="block h-[0.9cqw] w-[8cqw] rounded-full bg-[#dcd6ea]" />
                <span className="block h-[2.2cqw] w-[12cqw] rounded-full bg-[#242334]" />
                <span
                  className="block h-[0.9cqw] w-[6cqw] rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-[1.6fr_1fr] gap-[2cqw]">
            <div className="flex flex-col rounded-[1.6cqw] border border-[#ece8f6] bg-white p-[2cqw]">
              <span className="block h-[1.1cqw] w-[12cqw] rounded-full bg-[#242334]" />
              <div className="mt-[2cqw] flex min-h-0 flex-1 items-end gap-[1.4cqw]">
                {BARS.map((height, index) => (
                  <span
                    key={index}
                    className={`flex-1 rounded-t-[0.6cqw] ${index === 5 ? "bg-[#6650d8]" : "bg-[#d9d1fb]"}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-[1.6cqw] rounded-[1.6cqw] border border-[#ece8f6] bg-white p-[2cqw]">
              <span className="block h-[1.1cqw] w-[9cqw] rounded-full bg-[#242334]" />
              {["#b4a6f4", "#ffc46b", "#7cb8ff", "#ff9ec7"].map((color) => (
                <div key={color} className="flex items-center gap-[1.2cqw]">
                  <span
                    className="size-[2.4cqw] shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="h-[0.9cqw] flex-1 rounded-full bg-[#e3dfee]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileMock() {
  return (
    // cqw resolves against an ancestor container, so spacing lives on the inner div.
    <div className="@container size-full overflow-hidden bg-[#fbfaff] text-[#242334]">
      <div className="flex flex-col gap-[5cqw] px-[7cqw] pt-[16cqw]">
        <div className="flex items-center justify-between">
          <div className="space-y-[2cqw]">
            <span className="block h-[3cqw] w-[24cqw] rounded-full bg-[#dcd6ea]" />
            <span className="block h-[5cqw] w-[44cqw] rounded-full bg-[#242334]" />
          </div>
          <span className="size-[11cqw] rounded-full bg-[#ffc46b]" />
        </div>
        <div className="space-y-[4cqw] rounded-[7cqw] bg-[linear-gradient(135deg,#6650d8,#9b7bff_60%,#ff9ec7)] p-[7cqw] shadow-[0_6cqw_12cqw_-6cqw_rgba(102,80,216,0.7)]">
          <span className="block h-[2.6cqw] w-[26cqw] rounded-full bg-white/60" />
          <span className="block h-[8cqw] w-[52cqw] rounded-full bg-white" />
          <div className="flex gap-[3cqw]">
            <span className="h-[7cqw] flex-1 rounded-full bg-white/25" />
            <span className="h-[7cqw] flex-1 rounded-full bg-white" />
          </div>
        </div>
        <div className="flex gap-[3cqw]">
          {["#f0ecfc", "#ffe4ef", "#e0f2fe"].map((color) => (
            <span
              key={color}
              className="h-[16cqw] flex-1 rounded-[5cqw]"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="space-y-[4cqw]">
          {["#b4a6f4", "#7cb8ff", "#3ddc97", "#ff9ec7"].map((color) => (
            <div key={color} className="flex items-center gap-[4cqw]">
              <span
                className="size-[11cqw] shrink-0 rounded-[3.5cqw]"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 space-y-[2cqw]">
                <span className="block h-[2.8cqw] w-[70%] rounded-full bg-[#242334]" />
                <span className="block h-[2.2cqw] w-[45%] rounded-full bg-[#dcd6ea]" />
              </div>
              <span className="h-[3cqw] w-[12cqw] rounded-full bg-[#242334]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CODE_LINES: Array<Array<[string, number]>> = [
  [
    ["#8b5cf6", 10],
    ["#e4e4ea", 22],
  ],
  [
    ["#3ddc97", 6],
    ["#e4e4ea", 30],
    ["#ffc46b", 12],
  ],
  [
    ["#7cb8ff", 14],
    ["#e4e4ea", 18],
  ],
  [
    ["#e4e4ea", 8],
    ["#ff7ac3", 20],
    ["#e4e4ea", 10],
  ],
  [
    ["#3ddc97", 6],
    ["#e4e4ea", 26],
  ],
  [
    ["#8b5cf6", 12],
    ["#7cb8ff", 16],
    ["#e4e4ea", 8],
  ],
  [
    ["#e4e4ea", 20],
    ["#ffc46b", 10],
  ],
  [
    ["#3ddc97", 6],
    ["#e4e4ea", 34],
  ],
];

export function TerminalMock() {
  return (
    <div className="@container size-full overflow-hidden bg-[#0d0d12]">
      <div className="space-y-[2.2cqw] p-[4cqw]">
        {CODE_LINES.map((line, row) => (
          <div key={row} className="flex items-center gap-[1.2cqw]">
            <span className="w-[2.4cqw] text-right font-mono text-[1.6cqw] text-[#5c5c6b]">
              {row + 1}
            </span>
            {line.map(([color, width], index) => (
              <span
                key={index}
                className="h-[1.4cqw] rounded-full opacity-90"
                style={{ width: `${width}cqw`, backgroundColor: color }}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-[1.2cqw] pt-[1cqw]">
          <span className="font-mono text-[1.8cqw] text-[#3ddc97]">❯</span>
          <span className="h-[2.2cqw] w-[1.1cqw] animate-pulse bg-[#e4e4ea] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
