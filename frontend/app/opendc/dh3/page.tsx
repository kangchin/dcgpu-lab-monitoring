"use client";
import axios from "axios";
import { useState, useEffect } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { TempInfo } from "@/components/temp-info";
import { PowerInfo } from "@/components/power-info";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedCircles } from "@/components/animated-circles";
import { Bolt } from "@/components/bolt";
import { TempSensor } from "@/components/temp-sensor";

const A = 200, B = 500, pA1 = 230, pA2 = 260, pB1 = 530, pB2 = 560;
const ba = (y: number) => [{x: pA1, y}, {x: pA2, y}];
const bb = (y: number) => [{x: pB1, y}, {x: pB2, y}];
const y_start = 240;

const leftRackBlocks = [
  {routeRack:"a01", dataKey:"a01", labelPrefix:"A", number:"01", x:A, y:y_start,     width:120, height:180, bolts:ba(y_start+75)},
  ...["04","05","06","07","08","09","10"].map((n, i) => ({
    routeRack:`a${n}`, dataKey:`a${n}`, labelPrefix:"A", number:n,
    x:A, y:y_start+180+i*60, width:120, height:60, bolts:ba(y_start+198+i*60)
  })),
  {routeRack:"a11", dataKey:"a11", labelPrefix:"A", number:"11", x:A, y:y_start+600, width:120, height:60, bolts:[{x:200,y:y_start+618},...ba(y_start+618),{x:290,y:y_start+618}]},
  {routeRack:"a12", dataKey:"a12", labelPrefix:"A", number:"12", x:A, y:y_start+660, width:120, height:60, bolts:ba(y_start+678)},
];

const rightRackBlocks = [
  {routeRack:"b01", dataKey:"b01", labelPrefix:"B", number:"01", x:B, y:y_start,     width:120, height:90,  bolts:bb(y_start+30) },
  {routeRack:"b03", dataKey:"b03", labelPrefix:"B", number:"03", x:B, y:y_start+90,  width:120, height:60,  bolts:bb(y_start+107)},
  {routeRack:"b04", dataKey:"b04", labelPrefix:"B", number:"04", x:B, y:y_start+150, width:120, height:90,  bolts:bb(y_start+180)},
  ...["05","06","07","08","09","10","11","12"].map((n, i) => ({
    routeRack:`b${n}`, dataKey:`b${n}`, labelPrefix:"B", number:n,
    x:B, y:y_start+240+i*60, width:120, height:60, bolts:bb(y_start+258+i*60)
  })),
];

const sensorPoints = [
  {cx:A,   cy:y_start+300,    location:"a06-2-up"  },
  {cx:320, cy:y_start+300,    location:"a06-1-down"},
  {cx:320, cy:y_start+480,    location:"a09-1-up"  },
  {cx:A,   cy:y_start+480,    location:"a09-2-up"  },
  {cx:A,   cy:y_start+660+60, location:"a12-2-up"  },
  {cx:320, cy:y_start+660+60, location:"a12-1-down"},

  {cx:620, cy:y_start+300,    location:"b06-2-up"  },
  {cx:B,   cy:y_start+300,    location:"b06-1-down"},
  {cx:B,   cy:y_start+480,    location:"b09-1-up"  },
  {cx:620, cy:y_start+480,    location:"b09-2-up"  },
  {cx:620, cy:y_start+660+60, location:"b12-2-up"  },
  {cx:B,   cy:y_start+660+60, location:"b12-1-down"},
];

const cracBlocks = [
  {id:1, maskId:"semicircle-mask-1", x:700, y:1170, width:220, height:100, animX:220, animY:100, label:"CRAC-1", yheight:-65},
  {id:2, maskId:"semicircle-mask-2", x:400, y:1170, width:220, height:100, animX:220, animY:100, label:"CRAC-2", yheight:-65},
  {id:3, maskId:"semicircle-mask-3", x:100, y:1170, width:220, height:100, animX:220, animY:100, label:"CRAC-3", yheight:-65},
  {id:4, maskId:"semicircle-mask-4", x:620, y:0,    width:220, height:100, animX:220, animY:100, label:"CRAC-4", yheight:100},
  {id:5, maskId:"semicircle-mask-5", x:320, y:0,    width:220, height:100, animX:220, animY:100, label:"CRAC-5", yheight:100},
];

const grillColumnOffsets = [10, 20, 30, 40, 50];
const grillRows    = 47;
const grillStartY  = 490;
const grillStepY   = 10;
const grillSections = [
  {x:320, y:480, width:60, height:480},
  {x:380, y:480, width:60, height:480},
  {x:440, y:480, width:60, height:480},
];
const rackClassName = "cursor-pointer transition-transform duration-200 hover:-translate-y-0.5";

const SVG_DEFS = (
  <defs>
    <mask id="semicircle-mask-1"><path d="M230,42 A130,200 0 0,1 130,42 Z" fill="white"/></mask>
    <mask id="semicircle-mask-2"><path d="M120,452 A130,200 0 0,0 20,452 Z" fill="white"/></mask>
    <mask id="semicircle-mask-3"><path d="M230,452 A130,200 0 0,0 130,452 Z" fill="white"/></mask>
    <mask id="semicircle-mask-4"><path d="M345,452 A130,200 0 0,0 245,452 Z" fill="white"/></mask>
    <mask id="semicircle-mask-5"><path d="M340,42 A130,200 0 0,1 240,42 Z" fill="white"/></mask>
  </defs>
);

export default function OpenDCRoom3() {
  const { theme } = useTheme();
  const router = useRouter();
  const [currPower, setCurrPower] = useState<any[]>([]);
  const [rackPDUs, setRackPDUs] = useState<any>({});
  const [rackTemperature, setRackTemperature] = useState<any>({});

  const colorConfig = {
    particles:    theme === "dark" ? "#FFFFFF" : "#8EC5FF",
    grill:        theme === "dark" ? "#5F6A7E" : "#C6CBD3",
    block_fill:   theme === "dark" ? "#272D3C" : "#F6F8FA",
    block_stroke: theme === "dark" ? "#424C5E" : "#e2e8f0",
    text:         theme === "dark" ? "#A8ABBE" : "#5A5A5A",
    canvas_fill:  theme === "dark" ? "#1F2430" : "#FFFFFF",
  };

  const renderRackBlock = (block: any) => (
    <g key={block.routeRack} className={rackClassName} onClick={() => router.push(`/opendc/dh3/power/${block.routeRack}`)}>
      <rect x={block.x} y={block.y} width={block.width} height={block.height} fill={colorConfig.block_fill} stroke={colorConfig.block_stroke}/>
      {block.bolts.map((bolt: any, index: number) => (
        <Bolt key={`${block.routeRack}-${index}`} rack={`${block.labelPrefix}${block.number}-${index + 1}`}
          theme={theme} power={rackPDUs[block.dataKey]?.[index]?.reading} size={0.5} x={bolt.x} y={bolt.y}/>
      ))}
    </g>
  );

  const renderCRACBlock = (crac: typeof cracBlocks[0]) => (
    <g key={crac.id}>
      <g mask={`url(#${crac.maskId})`}>
        <AnimatedCircles color={colorConfig.particles} startX={crac.animX} startY={crac.animY}/>
      </g>
      <rect x={crac.x} y={crac.y} width={crac.width} height={crac.height} fill={colorConfig.block_fill} stroke={colorConfig.block_stroke}/>
      <text x={crac.x+crac.width/2} y={crac.y+crac.height/2} textAnchor="middle" dominantBaseline="middle"
        fontSize="25" fill={colorConfig.text} fontFamily="sans-serif">{crac.label}</text>
      <AnimatedCircles color={colorConfig.particles} startX={crac.x-5} startY={crac.y+crac.yheight}/>
    </g>
  );

  useEffect(() => {
    const fetch = () => {
      axios.get(`/api/power/latest?site=odcdh3`).then(r => {
        if (r.status !== 200) return;
        const power = r.data || [];
        setCurrPower(power);
        const pdus: Record<string, any[]> = {};
        for (const p of power) {
          const rack = p?.location?.split("-")[0];
          if (rack) { if (!pdus[rack]) pdus[rack] = []; pdus[rack].push(p); }
        }
        setRackPDUs(pdus);
      }).catch(console.log);
      axios.get(`/api/temperature/latest?site=odcdh3`).then(r => {
        if (r.status !== 200) return;
        const tempMap: Record<string, number> = {};
        for (const item of (r.data || [])) {
          const rack = item?.location, reading = item?.reading;
          if (typeof rack === "string" && rack && typeof reading === "number")
            tempMap[rack] = (tempMap[rack] ?? 0) + reading;
        }
        setRackTemperature(tempMap);
      }).catch(console.log);
    };
    fetch();
    const iv = setInterval(fetch, 60000);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <p className="flex text-xl font-bold text-left pb-3">OpenDC — Data Hall 3</p>
      <div className="flex w-full space-x-3">
        <div className="flex flex-col items-start space-y-3 w-5/6">
          <Card className="w-full p-2">
            <CardHeader className="text-left">
              <CardTitle>Room Visualiser</CardTitle>
              <CardDescription>
                {currPower.length > 0 && "Last checked " + formatDate(currPower[0].created)}
              </CardDescription>
              <div className="w-full rounded-lg border border-slate-200 dark:border-[#424C5E] bg-background/40 dark:bg-secondary-dark/40 p-2">
                <TooltipProvider delayDuration={0}>
                  <svg viewBox="5 5 929 1270" width="75%" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block", margin:"0 auto"}} role="img" aria-label="Data Hall 3 floor plan">
                    <rect x="5" y="5" width="929" height="1270" fill={colorConfig.canvas_fill} stroke={colorConfig.block_stroke}/>
                    {SVG_DEFS}
                    {cracBlocks.map(renderCRACBlock)}
                    {leftRackBlocks.map(renderRackBlock)}
                    {rightRackBlocks.map(renderRackBlock)}
                    <g>
                      {grillSections.map((section, si) => (
                        <g key={`dh3-grill-section-${si}`}>
                          <rect x={section.x} y={section.y} width={section.width} height={section.height} fill={colorConfig.block_fill} stroke={colorConfig.block_stroke}/>
                          {Array.from({length: grillRows}).map((_, row) => {
                            const y = grillStartY + row * grillStepY;
                            return grillColumnOffsets.map((offset, col) => {
                              const x = section.x + offset;
                              return (
                                <g key={`dh3-grill-${si}-${row}-${col}`}>
                                  <path d={`M${x} ${y-1.5}V${y+1.5}`} stroke={colorConfig.grill} strokeWidth="0.8"/>
                                  <path d={`M${x-1.5} ${y}H${x+1.5}`} stroke={colorConfig.grill} strokeWidth="0.8"/>
                                </g>
                              );
                            });
                          })}
                        </g>
                      ))}
                    </g>
                    {sensorPoints.map((s) => (
                      <TempSensor key={s.location} theme={theme} cx={s.cx} cy={s.cy}
                        datahall="dh3" location={s.location} temperature={rackTemperature[s.location]}/>
                    ))}
                  </svg>
                </TooltipProvider>
              </div>
            </CardHeader>
          </Card>
        </div>
        <div className="w-1/6 xl:block space-y-3">
          <TempInfo />
          <PowerInfo />
        </div>
      </div>
    </>
  );
}
