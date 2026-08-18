"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const SITES = [
  { id: "odcdh1", label: "DH 1", url: "/opendc/dh1" },
  { id: "odcdh2", label: "DH 2", url: "/opendc/dh2" },
  { id: "odcdh3", label: "DH 3", url: "/opendc/dh3" },
  { id: "odcdh4", label: "DH 4", url: "/opendc/dh4" },
  { id: "odcdh5", label: "DH 5", url: "/opendc/dh5" },
];

// Returns evenly-spaced Y positions for ramp rung lines
const rungYs = (roomY: number, roomH: number) =>
  [1,2,3,4,5,6,7,8,9,10].map(n => roomY + 3 + n * (roomH - 6) / 11);

const fmtKW = (w: number) => w > 0 ? `${(w / 1000).toFixed(1)} kW` : "—";

const TY = 10, TH = 134, BY = 162.1, BH = 127;

const R = {
  main_ramp: {x:136.4,  y:190,   w:23,     h:78  },
  sub_ramp:  {x:10.5,   y:25,    w:23,     h:85  },
  staircase: {x:320.5,  y:144,   w:15,     h:18.1},
  main_exit: {x:136.4,  y:281.1, w:23,     h:8   },
  sub1_exit: {x:10,     y:10,    w:24,     h:8   },
  sub2_exit: {x:340.7,  y:144,   w:8,      h:18.1},
  stg:       {x:34,     y:TY,    w:30.2,   h:90  },
  mdf:       {x:65.2,   y:TY,    w:60,     h:TH  },
  dh1:       {x:104.96, y:TY,    w:110.95, h:TH  },
  dh2:       {x:216.9,  y:TY,    w:131.8,  h:TH  },
  dh3:       {x:255.6,  y:BY,    w:92.9,   h:BH  },
  dh4:       {x:159.4,  y:BY,    w:95.2,   h:BH  },
  dh5:       {x:10,     y:BY,    w:126.4,  h:BH  },

};

const mainRungYs = rungYs(R.main_ramp.y, R.main_ramp.h);
const subRungYs  = rungYs(R.sub_ramp.y,  R.sub_ramp.h);

const rampDefs = [
  {key:"main_ramp", r:R.main_ramp, rungs:mainRungYs, prefix:"mr"},
  {key:"sub_ramp",  r:R.sub_ramp,  rungs:subRungYs,  prefix:"sr"},
];

const dhDefs = [
  {key:"dh2", site:"odcdh2", url:"/opendc/dh2", label:"Data Hall 2", r:R.dh2},
  {key:"dh3", site:"odcdh3", url:"/opendc/dh3", label:"Data Hall 3", r:R.dh3},
  {key:"dh4", site:"odcdh4", url:"/opendc/dh4", label:"Data Hall 4", r:R.dh4},
  {key:"dh5", site:"odcdh5", url:"/opendc/dh5", label:"Data Hall 5", r:R.dh5},
];

const doorDefs = [
  {xOffset: 3, sweepFlag: 0},   // left door, opens right
  {xOffset: 20, sweepFlag: 1},  // right door, opens left
];

// isTop: door on top wall; xShift: additional x offset from room's left edge
const hDoorDefs = [
  {key:"stg", r:R.stg, xShift:0,  isTop:false},
  {key:"dh1", r:R.dh1, xShift:40, isTop:false},
  {key:"dh2", r:R.dh2, xShift:65, isTop:false},
  {key:"dh3", r:R.dh3, xShift:0,  isTop:true },
  {key:"dh4", r:R.dh4, xShift:72, isTop:true },
  {key:"dh5", r:R.dh5, xShift:30, isTop:true },
];

// rotate: text rotated -90° for vertical exit signs
const exitDefs = [
  {key:"main_exit", r:R.main_exit, rotate:false},
  {key:"sub1_exit", r:R.sub1_exit, rotate:false},
  {key:"sub2_exit", r:R.sub2_exit, rotate:true },
];

export default function OpenDCOverview() {
  const { theme } = useTheme();
  const router = useRouter();
  const [powerBySite, setPowerBySite] = useState<Record<string,number>>({});
  const [lastUpdate, setLastUpdate] = useState("");
  const [hovered, setHovered] = useState<string|null>(null);

  const isDark = theme === "dark";
  const c = {
    bg:       isDark?"#1F2430":"#FFFFFF",
    roomFill: isDark?"#1A2235":"#EEF0F3",
    roomHover:isDark?"#313A4F":"#EEF2F8",
    wallStroke:isDark?"#5F6A7E":"#94A3B8",
    text:     isDark?"#A8ABBE":"#5A5A5A",
    dhAccent: isDark?"#3B82F6":"#2563EB",
    rampFill: isDark?"#151C2A":"#F1F5F9",
  };

  useEffect(() => {
    const fetchPower = async () => {
      const totals: Record<string,number> = {};
      await Promise.all(SITES.map(async (site) => {
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/power/latest?site=${site.id}`);
          const data = Array.isArray(res.data)?res.data:[];
          totals[site.id] = data.reduce((sum,r)=>sum+(r.reading??0),0);
        } catch { totals[site.id]=0; }
      }));
      setPowerBySite(totals);
      setLastUpdate(new Date().toLocaleTimeString());
    };
    fetchPower();
    const iv=setInterval(fetchPower,60000);
    return ()=>clearInterval(iv);
  }, []);

  return (
    <>
      <p className="flex text-xl font-bold text-left pb-3">OpenDC — Overview</p>
      <Card className="w-full">
        <CardHeader className="text-left pb-2">
          <CardTitle>Facility Floor Plan</CardTitle>
          <CardDescription>
            {lastUpdate?`Last updated: ${lastUpdate}`:"Loading power data…"}
            {" · Click a data hall to explore"}
          </CardDescription>
        </CardHeader>
        <div className="px-4 pb-4">
          <div className="w-full rounded-lg border border-slate-200 dark:border-[#424C5E] bg-background/40 dark:bg-secondary-dark/40 p-2">
            {/* Rooms fill coordinate space; viewBox crops/scales to fit */}
            <svg viewBox="5 5 348.7 289.1" width="100%" style={{display:"block"}}
              role="img" aria-label="Penang OpenDC facility floor plan">
              <rect x="5" y="5" width="348.7" height="289.1" fill={c.bg}/>

              {/* Boundary */}
              <rect x="10" y="10" width="338.7" height="279.1" fill="none" stroke={c.wallStroke} strokeWidth="1"/>

              {/* Ramps */}
              {rampDefs.map(({key,r,rungs,prefix})=>(
                <g key={key}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h}
                    fill={c.rampFill} stroke={c.wallStroke} strokeWidth="0.5" rx="2"/>
                  {rungs.map((y,i)=><line key={`${prefix}${i}`} x1={r.x+2} y1={y} x2={r.x+r.w-2} y2={y} stroke={c.wallStroke} strokeWidth="0.5"/>)}
                  <text x={r.x+r.w/2} y={r.y+r.h/2} fill={c.text} fontSize="3.5" fontWeight="300"
                    textAnchor="middle" transform={`rotate(-90,${r.x+r.w/2},${r.y+r.h/2})`}
                    letterSpacing="2">RAMP</text>
                </g>
              ))}

              {/* Staircase */}
              {(()=>{
                const r=R.staircase;
                return (
                  <g>
                    <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={c.rampFill} stroke={c.wallStroke} strokeWidth="0.5"/>
                    <line x1={r.x+r.w/3}   y1={r.y} x2={r.x+r.w/3}   y2={r.y+r.h} stroke={c.wallStroke} strokeWidth="0.5"/>
                    <line x1={r.x+r.w*2/3} y1={r.y} x2={r.x+r.w*2/3} y2={r.y+r.h} stroke={c.wallStroke} strokeWidth="0.5"/>
                    <text x={r.x+r.w/2} y={r.y+r.h/2+2.5} fill={c.text} fontSize="3.5" fontWeight="300" textAnchor="middle">STAIRCASE</text>
                  </g>
                );
              })()}

              {/* EXIT signs */}
              {exitDefs.map(({key, r, rotate}) => (
                <g key={key}>
                  <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#16a34a" stroke={c.wallStroke} strokeWidth="0.5" rx="1"/>
                  <text x={r.x+r.w/2} y={r.y+r.h/2+(rotate?0:1.5)} fill="#ffffff" fontSize="4" fontWeight="700"
                    textAnchor="middle"
                    transform={rotate?`rotate(-90,${r.x+r.w/2},${r.y+r.h/2})`:undefined}
                    letterSpacing={rotate?"1":undefined}>EXIT</text>
                </g>
              ))}

              {/* Staging Room */}
              {(()=>{
                const r=R.stg;
                const isHov=hovered==="stg";
                return (
                  <g style={{cursor:"default"}} onMouseEnter={()=>setHovered("stg")} onMouseLeave={()=>setHovered(null)}>
                    <rect x={r.x} y={r.y} width={r.w} height={r.h}
                      fill={isHov?c.roomHover:c.roomFill} stroke={isHov?c.dhAccent:c.wallStroke}
                      strokeWidth={isHov?2:1} style={{transition:"fill .15s,stroke .15s"}}/>
                    <text x={r.x+r.w/2} y={r.y+r.h/2-5} fill={c.text} fontSize="5" fontWeight="300" textAnchor="middle">STAGING</text>
                    <text x={r.x+r.w/2} y={r.y+r.h/2+5} fill={c.text} fontSize="5" fontWeight="300" textAnchor="middle">ROOM</text>
                  </g>
                );
              })()}

              {/* MDF Room*/}
              {(()=>{
                const r=R.mdf, {x,y}=r, w=60, h=134, nx=21.24, ny=44;
                const dw=8, wy1=y+h-20, wy2=y+h-3;
                const isHov=hovered==="mdf";
                const d=`M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h-ny} L ${x+w-nx} ${y+h-ny} L ${x+w-nx} ${y+h} L ${x} ${y+h} Z`;
                return (
                  <g style={{cursor:"default"}} onMouseEnter={()=>setHovered("mdf")} onMouseLeave={()=>setHovered(null)}>
                    <path d={d} fill={isHov?c.roomHover:c.roomFill}
                      stroke={isHov?c.dhAccent:c.wallStroke}
                      strokeWidth={isHov?2:1} style={{transition:"fill .15s,stroke .15s"}}/>
                    <rect x={x-0.8} y={wy1-0.5} width={1.6} height={dw+1} fill={c.bg}/>
                    <line x1={x} y1={wy1} x2={x-dw} y2={wy1} stroke={c.wallStroke} strokeWidth="0.8"/>
                    <path d={`M ${x-dw} ${wy1} A ${dw} ${dw} 0 0 0 ${x} ${wy1+dw}`}
                      fill="none" stroke={c.wallStroke} strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round"/>
                    <rect x={x-0.8} y={wy2-dw-0.5} width={1.6} height={dw+1} fill={c.bg}/>
                    <line x1={x} y1={wy2} x2={x-dw} y2={wy2} stroke={c.wallStroke} strokeWidth="0.8"/>
                    <path d={`M ${x-dw} ${wy2} A ${dw} ${dw} 0 0 1 ${x} ${wy2-dw}`}
                      fill="none" stroke={c.wallStroke} strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round"/>
                    <text x={x+w/2-nx/4} y={y+h/2-5} fill={c.text} fontSize="5" fontWeight="300" textAnchor="middle">IDF / MDF</text>
                    <text x={x+w/2-nx/4} y={y+h/2+5} fill={c.text} fontSize="5" fontWeight="300" textAnchor="middle">ROOM</text>
                  </g>
                );
              })()}

              {/* Data Hall 1 */}
              {(()=>{
                const {x,y}=R.dh1, w=110.95, h=134, nx=21.25, ny=90;
                const pw=powerBySite["odcdh1"]??0;
                const isHov=hovered==="dh1";
                const d=`M ${x} ${y+ny} L ${x+nx} ${y+ny} L ${x+nx} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`;
                return (
                  <g style={{cursor:"pointer"}} onClick={()=>router.push("/opendc/dh1")}
                    onMouseEnter={()=>setHovered("dh1")} onMouseLeave={()=>setHovered(null)}>
                    <path d={d} fill={isHov?c.roomHover:c.roomFill}
                      stroke={isHov?c.dhAccent:c.wallStroke}
                      strokeWidth={isHov?2:1} style={{transition:"fill .15s,stroke .15s"}}/>
                    <text x={x+w/2+nx/4} y={y+17} fill={c.dhAccent} fontSize="5" fontWeight="300" textAnchor="middle">Data Hall 1</text>
                    <text x={x+w/2+nx/4} y={y+h-8} fill={pw>0?c.dhAccent:c.text} fontSize="10" fontWeight="700" textAnchor="middle">{fmtKW(pw)}</text>
                  </g>
                );
              })()}

              {/* Data Hall 2 – 5 */}
              {dhDefs.map(({key,site,url,label,r})=>{
                const pw=powerBySite[site]??0;
                const isHov=hovered===key;
                return (
                  <g key={key} style={{cursor:"pointer"}} onClick={()=>router.push(url)}
                    onMouseEnter={()=>setHovered(key)} onMouseLeave={()=>setHovered(null)}>
                    <rect x={r.x} y={r.y} width={r.w} height={r.h}
                      fill={isHov?c.roomHover:c.roomFill} stroke={isHov?c.dhAccent:c.wallStroke}
                      strokeWidth={isHov?2:1} style={{transition:"fill .15s,stroke .15s"}}/>
                    <text x={r.x+r.w/2} y={r.y+17} fill={c.dhAccent} fontSize="5" fontWeight="300" textAnchor="middle">{label}</text>
                    <text x={r.x+r.w/2} y={r.y+r.h-8} fill={pw>0?c.dhAccent:c.text} fontSize="10" fontWeight="700" textAnchor="middle">{fmtKW(pw)}</text>
                  </g>
                );
              })}

              {/* All horizontal wall doors — rendered after data halls for correct z-order */}
              {hDoorDefs.flatMap(({key, r, xShift, isTop}) =>
                doorDefs.map(({xOffset, sweepFlag}, idx) => {
                  const dw=8, hx=r.x+xOffset+xShift, hy=isTop?r.y:r.y+r.h;
                  const dy=isTop?-dw:dw, sf=isTop?(sweepFlag===0?1:0):sweepFlag;
                  const arcEndX=sweepFlag===0?hx+dw:hx-dw, rectX=sweepFlag===0?hx-0.5:hx-8.5;
                  return (
                    <g key={`${key}-door-${idx}`}>
                      <rect x={rectX} y={hy-0.8} width={dw+1} height={1.6} fill={c.bg}/>
                      <line x1={hx} y1={hy} x2={hx} y2={hy+dy} stroke={c.wallStroke} strokeWidth="0.8"/>
                      <path d={`M ${hx} ${hy+dy} A ${dw} ${dw} 0 0 ${sf} ${arcEndX} ${hy}`}
                        fill="none" stroke={c.wallStroke} strokeWidth="0.5" strokeDasharray="1 0.8" strokeLinecap="round"/>
                    </g>
                  );
                })
              )}
            </svg>
          </div>
        </div>
        <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SITES.map((site)=>(
            <button key={site.id} type="button" onClick={()=>router.push(site.url)}
              className="text-left rounded-lg border border-slate-200 dark:border-[#424C5E] bg-background/40 dark:bg-secondary-dark/40 px-3 py-2 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <p className="text-xs text-gray-500 dark:text-gray-400">{site.label}</p>
              <p className="text-base font-bold text-blue-600 dark:text-blue-400">{fmtKW(powerBySite[site.id]??0)}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">total power</p>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}
