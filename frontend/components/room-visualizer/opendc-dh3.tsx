import React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { AnimatedCircles } from "@/components/animated-circles";
import { Bolt } from "@/components/bolt";
import { TempSensor } from "@/components/temp-sensor";
import { useRouter } from "next/navigation";

interface RoomVisualizerProps {
  theme?: string;
  powerData?: any[] | null | undefined;
  temperatureData?: any[] | null | undefined;
}

const OpenDCDH3: React.FC<RoomVisualizerProps> = ({
  theme,
  powerData,
  temperatureData,
}) => {
  const [rackPDUs, setRackPDUs] = useState<any>({});
  const [rackTemperature, setRackTemperature] = useState<any>({});

  const router = useRouter();

  const colorConfig = {
    particles: theme == "dark" ? "#FFFFFF" : "#8EC5FF",
    grill: theme == "dark" ? "#5F6A7E" : "#C6CBD3",
    block_fill: theme == "dark" ? "#272D3C" : "#F6F8FA",
    block_stroke: theme == "dark" ? "#424C5E" : "#e2e8f0",
    text: theme == "dark" ? "#A8ABBE" : "#5A5A5A",
    canvas_fill: theme == "dark" ? "#1F2430" : "#FFFFFF",
  };

  const rackAisleAPosition = 90;
  const rackAisleBPosition = 190;
  const pdu1AisleAPosition = 102;
  const pdu2AisleAPosition = 110;
  const pdu1AisleBPosition = 202;
  const pdu2AisleBPosition = 210;

  const grillColumnOffsets = [5, 10, 15];
  const grillRows = 23;
  const grillStartY = 200;
  const grillStepY = 8;
  const grillSections = [
    { x: 130, y: 196, width: 20, height: 184 },
    { x: 150, y: 196, width: 20, height: 184 },
    { x: 170, y: 196, width: 20, height: 184 },
  ];
  const rackClassName = "cursor-pointer transition-transform duration-200 hover:-translate-y-0.5";

  const leftRackBlocks = [
    { routeRack: "a01", dataKey: "a01", labelPrefix: "A", number: "01", x: rackAisleAPosition, y: 100, width: 40, height: 64, bolts: [{ x: pdu1AisleAPosition, y: 133 }, { x: pdu2AisleAPosition, y: 133 }] },
    { routeRack: "a04", dataKey: "a04", labelPrefix: "A", number: "04", x: rackAisleAPosition, y: 164, width: 40, height: 32, bolts: [{ x: pdu1AisleAPosition, y: 176 }, { x: pdu2AisleAPosition, y: 176 }] },
    { routeRack: "a05", dataKey: "a05", labelPrefix: "A", number: "05", x: rackAisleAPosition, y: 196, width: 40, height: 23, bolts: [{ x: pdu1AisleAPosition, y: 204 }, { x: pdu2AisleAPosition, y: 204 }] },
    { routeRack: "a06", dataKey: "a06", labelPrefix: "A", number: "06", x: rackAisleAPosition, y: 219, width: 40, height: 23, bolts: [{ x: pdu1AisleAPosition, y: 227 }, { x: pdu2AisleAPosition, y: 227 }] },
    { routeRack: "a07", dataKey: "a07", labelPrefix: "A", number: "07", x: rackAisleAPosition, y: 242, width: 40, height: 23, bolts: [{ x: pdu1AisleAPosition, y: 250 }, { x: pdu2AisleAPosition, y: 250 }] },
    { routeRack: "a08", dataKey: "a08", labelPrefix: "A", number: "08", x: rackAisleAPosition, y: 265, width: 40, height: 23, bolts: [{ x: pdu1AisleAPosition, y: 273 }, { x: pdu2AisleAPosition, y: 273 }] },
    { routeRack: "a09", dataKey: "a09", labelPrefix: "A", number: "09", x: rackAisleAPosition, y: 288, width: 40, height: 23, bolts: [{ x: pdu1AisleAPosition, y: 296 }, { x: pdu2AisleAPosition, y: 296 }] },
    { routeRack: "a10", dataKey: "a10", labelPrefix: "A", number: "10", x: rackAisleAPosition, y: 311, width: 40, height: 23, bolts: [{ x: pdu1AisleAPosition, y: 319 }, { x: pdu2AisleAPosition, y: 319 }] },
    { routeRack: "a11", dataKey: "a11", labelPrefix: "A", number: "11", x: rackAisleAPosition, y: 334, width: 40, height: 23, bolts: [{ x: 94, y: 342 }, { x: pdu1AisleAPosition, y: 342 }, { x: pdu2AisleAPosition, y: 342 }, { x: 118, y: 342 }] },
    { routeRack: "a12", dataKey: "a12", labelPrefix: "A", number: "12", x: rackAisleAPosition, y: 357, width: 40, height: 23, bolts: [{ x: pdu1AisleAPosition, y: 364.5 }, { x: pdu2AisleAPosition, y: 364.5 }] },
  ];

  const rightRackBlocks = [
    { routeRack: "b01", dataKey: "b01", labelPrefix: "B", number: "01", x: rackAisleBPosition, y: 100, width: 40, height: 32, bolts: [{ x: pdu1AisleBPosition, y: 112.5 }, { x: pdu2AisleBPosition, y: 112.5 }] },
    { routeRack: "b03", dataKey: "b03", labelPrefix: "B", number: "03", x: rackAisleBPosition, y: 132, width: 40, height: 32, bolts: [{ x: pdu1AisleBPosition, y: 144.5 }, { x: pdu2AisleBPosition, y: 144.5 }] },
    { routeRack: "b04", dataKey: "b04", labelPrefix: "B", number: "04", x: rackAisleBPosition, y: 164, width: 40, height: 32, bolts: [{ x: pdu1AisleBPosition, y: 176.5 }, { x: pdu2AisleBPosition, y: 176.5 }] },
    { routeRack: "b05", dataKey: "b05", labelPrefix: "B", number: "05", x: rackAisleBPosition, y: 196, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 204 }, { x: pdu2AisleBPosition, y: 204 }] },
    { routeRack: "b06", dataKey: "b06", labelPrefix: "B", number: "06", x: rackAisleBPosition, y: 219, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 227 }, { x: pdu2AisleBPosition, y: 227 }] },
    { routeRack: "b07", dataKey: "b07", labelPrefix: "B", number: "07", x: rackAisleBPosition, y: 242, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 250 }, { x: pdu2AisleBPosition, y: 250 }] },
    { routeRack: "b08", dataKey: "b08", labelPrefix: "B", number: "08", x: rackAisleBPosition, y: 265, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 273 }, { x: pdu2AisleBPosition, y: 273 }] },
    { routeRack: "b09", dataKey: "b09", labelPrefix: "B", number: "09", x: rackAisleBPosition, y: 288, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 296 }, { x: pdu2AisleBPosition, y: 296 }] },
    { routeRack: "b10", dataKey: "b10", labelPrefix: "B", number: "10", x: rackAisleBPosition, y: 311, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 319 }, { x: pdu2AisleBPosition, y: 319 }] },
    { routeRack: "b11", dataKey: "b11", labelPrefix: "B", number: "11", x: rackAisleBPosition, y: 334, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 342 }, { x: pdu2AisleBPosition, y: 342 }] },
    { routeRack: "b12", dataKey: "b12", labelPrefix: "B", number: "12", x: rackAisleBPosition, y: 357, width: 40, height: 23, bolts: [{ x: pdu1AisleBPosition, y: 364.5 }, { x: pdu2AisleBPosition, y: 364.5 }] },
  ];

  const sensorPoints = [
    { cx: 90, cy: 219, location: "a06-2-up" },
    { cx: 130, cy: 219, location: "a06-1-down" },
    { cx: 130, cy: 299.5, location: "a09-1-up" },
    { cx: 90, cy: 290, location: "a09-2-up" },
    { cx: 90, cy: 380, location: "a12-2-up" },
    { cx: 130, cy: 380, location: "a12-1-down" },
    { cx: 230, cy: 220.5, location: "b06-2-up" },
    { cx: 190, cy: 220.5, location: "b06-1-down" },
    { cx: 190, cy: 299.5, location: "b09-1-up" },
    { cx: 230, cy: 290, location: "b09-2-up" },
    { cx: 230, cy: 381, location: "b12-2-up" },
    { cx: 190, cy: 381, location: "b12-1-down" },
  ];

  const renderRackBlock = (block: any) => (
    <g
      key={block.routeRack}
      className={rackClassName}
      onClick={() => router.push(`/opendc/dh3/power/${block.routeRack}`)}
    >
      <rect
        x={block.x}
        y={block.y}
        width={block.width}
        height={block.height}
        fill={colorConfig.block_fill}
        stroke={colorConfig.block_stroke}
      />
      {block.bolts.map((bolt: any, index: number) => (
        <Bolt
          key={`${block.routeRack}-${index}`}
          rack={`${block.labelPrefix}${block.number}-${index + 1}`}
          theme={theme}
          power={rackPDUs[block.dataKey]?.[index]?.reading}
          size={0.17857}
          x={bolt.x}
          y={bolt.y}
        />
      ))}
    </g>
  );

  const cracBlocks = [
    { id: 1, maskId: "semicircle-mask-1", x: 260, y: 458, width: 75, height: 35, animX: 256, animY: 432, label: "CRAC-1", yheight: -20 },
    { id: 2, maskId: "semicircle-mask-2", x: 155, y: 458, width: 75, height: 35, animX: 140, animY: 432, label: "CRAC-2", yheight: -20 },
    { id: 3, maskId: "semicircle-mask-3", x: 50,  y: 458, width: 75, height: 35, animX: 28,  animY: 432, label: "CRAC-3", yheight: -20 },
    { id: 4, maskId: "semicircle-mask-4", x: 225, y: 0,   width: 75, height: 35, animX: 250, animY: 42,  label: "CRAC-4", yheight: 40 },
    { id: 5, maskId: "semicircle-mask-5", x: 120, y: 0,   width: 75, height: 35, animX: 140, animY: 42,  label: "CRAC-5", yheight: 40 },
  ];

  const renderCRACBlock = (crac: typeof cracBlocks[0]) => (
    <g key={crac.id}>
      <g mask={`url(#${crac.maskId})`}>
        <AnimatedCircles color={colorConfig.particles} startX={crac.animX} startY={crac.animY} />
      </g>
      <rect
        x={crac.x}
        y={crac.y}
        width={crac.width}
        height={crac.height}
        fill={colorConfig.block_fill}
        stroke={colorConfig.block_stroke}
      />
      <text
        x={crac.x + crac.width / 2}
        y={crac.y + crac.height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="7"
        fill={colorConfig.text}
        fontFamily="sans-serif"
      >
        {crac.label}
      </text>
      <AnimatedCircles
        color={colorConfig.particles}
        startX={crac.x - 5}
        startY={crac.y + crac.yheight}
      />
    </g>
  );

  //EFFECTS
  useEffect(() => {
    const tempRackPDUs: Record<string, any[]> = {};
    
    if (powerData && powerData.length > 0) {
      for (let i = 0; i < powerData.length; i++) {
        const pduData = powerData[i];
        const location = pduData?.location;
        if (typeof location !== "string" || location.length === 0) {
          continue;
        }
        const rack = location.split("-")[0];

        // Store individual PDU data
        if (!tempRackPDUs[rack]) {
          tempRackPDUs[rack] = [];
        }
        tempRackPDUs[rack].push(pduData);
      }
    }
    setRackPDUs(tempRackPDUs);
  }, [powerData]);

  useEffect(() => {
    const tempTemperature: Record<string, number> = {};
    if (temperatureData && temperatureData.length > 0) {
      for (let i = 0; i < temperatureData.length; i++) {
        const rack = temperatureData[i]?.location;
        const reading = temperatureData[i]?.reading;
        if (typeof rack !== "string" || rack.length === 0 || typeof reading !== "number") {
          continue;
        }

        if (tempTemperature[rack]) {
          tempTemperature[rack] += reading;
        } else {
          tempTemperature[rack] = reading;
        }
      }
    }
    setRackTemperature(tempTemperature);
  }, [temperatureData]);

  return (
    <TooltipProvider delayDuration={0}>
      <svg
        className="w-full h-full max-h-[950px]"
        width="343"
        height="493"
        viewBox="0 0 343 493"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="semicircle-mask-1">
            <path d="M230,42 A130,200 0 0,1 130,42 Z" fill="white" />
          </mask>
          <mask id="semicircle-mask-2">
            <path d="M120,452 A130,200 0 0,0 20,452 Z" fill="white" />
          </mask>
          <mask id="semicircle-mask-3">
            <path d="M230,452 A130,200 0 0,0 130,452 Z" fill="white" />
          </mask>
          <mask id="semicircle-mask-4">
            <path d="M345,452 A130,200 0 0,0 245,452 Z" fill="white" />
          </mask>
          <mask id="semicircle-mask-5">
            <path d="M340,42 A130,200 0 0,1 240,42 Z" fill="white" />
          </mask>
        </defs>
        <rect
          x="0.5"
          y="0.5"
          width="342"
          height="492"
          fill={colorConfig.canvas_fill}
        />
        <rect
          x="0.5"
          y="0.5"
          width="342"
          height="492"
          stroke={colorConfig.block_stroke}
        />
        {cracBlocks.map(renderCRACBlock)}
        <mask id="path-17-inside-6_1039_19" fill="white">
          <path d="M93 197H135V220H93V197Z" />
        </mask>

        {/* Aisle A */}
        {leftRackBlocks.map(renderRackBlock)}

        {/* Aisle B */}
        {rightRackBlocks.map(renderRackBlock)}

        {/* MIDDLE GRILL PATTERN */}
        <g>
          {grillSections.map((section, sectionIndex) => (
            <g key={`dh3-grill-section-${sectionIndex}`}>
              <rect
                x={section.x}
                y={section.y}
                width={section.width}
                height={section.height}
                fill={colorConfig.block_fill}
                stroke={colorConfig.block_stroke}
              />
              {Array.from({ length: grillRows }).map((_, row) => {
                const y = grillStartY + row * grillStepY;
                return grillColumnOffsets.map((offset, col) => {
                  const x = section.x + offset;
                  return (
                    <g key={`dh3-grill-${sectionIndex}-${row}-${col}`}>
                      <path d={`M${x} ${y - 1.5}V${y + 1.5}`} stroke={colorConfig.grill} strokeWidth="0.8" />
                      <path d={`M${x - 1.5} ${y}H${x + 1.5}`} stroke={colorConfig.grill} strokeWidth="0.8" />
                    </g>
                  );
                });
              })}
            </g>
          ))}
        </g>

        {/* CIRCLES */}
        {sensorPoints.map((sensor) => (
          <TempSensor
            key={sensor.location}
            theme={theme}
            cx={sensor.cx}
            cy={sensor.cy}
            datahall="dh3"
            location={sensor.location}
            temperature={rackTemperature[sensor.location]}
          />
        ))}

      </svg>
    </TooltipProvider>
  );
};

export { OpenDCDH3 };
