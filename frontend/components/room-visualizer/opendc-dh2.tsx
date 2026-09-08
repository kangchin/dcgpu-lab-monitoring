import React from "react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { ChartConfig } from "@/components/ui/chart";
import { AnimatedCircles } from "@/components/animated-circles";
import { Bolt } from "@/components/bolt";
import { TempSensor } from "@/components/temp-sensor";
import { useRouter } from "next/navigation";

interface RoomVisualizerProps {
  theme?: string;
  powerData?: any[];
  temperatureData?: any[];
}
const OpenDCDH2: React.FC<RoomVisualizerProps> = ({ theme, powerData, temperatureData }) => {

  const [rackPower, setRackPower] = useState<any>({});
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

  //EFFECTS
  useEffect(() => {
    const tempRackPower: Record<string, number> = {};
    const tempRackPDUs: Record<string, any[]> = {};
    if (powerData && powerData.length > 0) {
      for (let i = 0; i < powerData.length; i++) {
        const rack = powerData[i].location.split("-")[0];
        const reading = powerData[i].reading;
        const pduData = powerData[i];

        // Aggregate total power per rack
        if (tempRackPower[rack]) {
          tempRackPower[rack] += reading;
        } else {
          tempRackPower[rack] = reading;
        }

        // Collect individual PDU readings per rack
        if (!tempRackPDUs[rack]) {
          tempRackPDUs[rack] = [];
        }
        tempRackPDUs[rack].push(pduData);
      }
    }
    setRackPower(tempRackPower);
    setRackPDUs(tempRackPDUs);
  }, [powerData]);

  useEffect(() => {
    const tempTemperature: Record<string, number> = {};
    if (temperatureData && temperatureData.length > 0) {
      for (let i = 0; i < temperatureData.length; i++) {
        const rack = temperatureData[i].location;
        const reading = temperatureData[i].reading;

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
      width="503"
      height="508"
      viewBox="0 0 503 508"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <mask id="semicircle-mask-1">
          <path d="M222,42 A130,200 0 0,1 132,42 Z" fill="white" />
        </mask>
        <mask id="semicircle-mask-2">
          <path d="M448,42 A130,200 0 0,1 358,42 Z" fill="white" />
        </mask>
        <mask id="semicircle-mask-3">
          <path d="M335,42 A130,200 0 0,1 245,42 Z" fill="white" />
        </mask>
        <mask id="semicircle-mask-4">
          <path d="M107,42 A130,200 0 0,1 17,42 Z" fill="white" />
        </mask>
        <mask id="semicircle-mask-5">
          <path d="M123,465 A130,200 0 0,0 35,465 Z" fill="white" />
        </mask>
        <mask id="semicircle-mask-6">
          <path d="M215,465 A130,200 0 0,0 127,465 Z" fill="white" />
        </mask>
        <mask id="semicircle-mask-7">
          <path d="M407,465 A130,200 0 0,0 319,465 Z" fill="white" />
        </mask>
        <mask id="semicircle-mask-8">
          <path d="M500,465 A130,200 0 0,0 412,465 Z" fill="white" />
        </mask>
      </defs>
      <path d="M0 1H502V507H0V1Z" fill={colorConfig.canvas_fill} />
      <path
        d="M1 1V0.5H0.5V1H1ZM503 1H503.5V0.5H503V1ZM503 507V507.5H503.5V507H503ZM1 507H0.5V507.5H1V507ZM1 1V1.5H503V1V0.5H1V1ZM503 1H502.5V507H503H503.5V1H503ZM503 507V506.5H1V507V507.5H503V507ZM1 507H1.5V1H1H0.5V507H1Z"
        fill={colorConfig.block_stroke}
      />
      
      {/* ====================== ROW A (A01 - A14) ====================== */}

      {/* A01 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a01")}
      >
        <mask id="path-31-inside-15_1077_273" fill="white">
          <path d="M91 91H133V114H91V91Z" />
        </mask>
        <path d="M91 91H133V114H91V91Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A01"
          theme={theme}
          power={rackPDUs["a01"] && rackPDUs["a01"][0] ? rackPDUs["a01"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={97.5}
        />
        <path
          d="M91 91V90H90V91H91ZM133 91H134V90H133V91ZM91 91V92H133V91V90H91V91ZM133 91H132V114H133H134V91H133ZM91 114H92V91H91H90V114H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-31-inside-15_1077_273)"
        />
      </g>

      {/* A02 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a02")}
      >
        <mask id="path-33-inside-16_1077_273" fill="white">
          <path d="M91 114H133V137H91V114Z" />
        </mask>
        <path d="M91 114H133V137H91V114Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A02"
          theme={theme}
          power={rackPDUs["a02"] && rackPDUs["a02"][0] ? rackPDUs["a02"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={120.5}
        />
        <path
          d="M91 114V113H90V114H91ZM133 114H134V113H133V114ZM91 114V115H133V114V113H91V114ZM133 114H132V137H133H134V114H133ZM91 137H92V114H91H90V137H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-33-inside-16_1077_273)"
        />
      </g>

      {/* A03 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a03")}
      >
        <mask id="path-35-inside-17_1077_273" fill="white">
          <path d="M91 137H133V160H91V137Z" />
        </mask>
        <path d="M91 137H133V160H91V137Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A03"
          theme={theme}
          power={rackPDUs["a03"] && rackPDUs["a03"][0] ? rackPDUs["a03"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={143.5}
        />
        <path
          d="M91 137V136H90V137H91ZM133 137H134V136H133V137ZM91 137V138H133V137V136H91V137ZM133 137H132V160H133H134V137H133ZM91 160H92V137H91H90V160H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-35-inside-17_1077_273)"
        />
      </g>

      {/* A04 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a04")}
      >
        <mask id="path-37-inside-18_1077_273" fill="white">
          <path d="M91 160H133V183H91V160Z" />
        </mask>
        <path d="M91 160H133V183H91V160Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A04"
          theme={theme}
          power={rackPDUs["a04"] && rackPDUs["a04"][0] ? rackPDUs["a04"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={166.5}
        />
        <path
          d="M91 160V159H90V160H91ZM133 160H134V159H133V160ZM91 160V161H133V160V159H91V160ZM133 160H132V183H133H134V160H133ZM91 183H92V160H91H90V183H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-37-inside-18_1077_273)"
        />
      </g>

      {/* A05 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a05")}
      >
        <mask id="path-39-inside-19_1077_273" fill="white">
          <path d="M91 183H133V206H91V183Z" />
        </mask>
        <path d="M91 183H133V206H91V183Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A05"
          theme={theme}
          power={rackPDUs["a05"] && rackPDUs["a05"][0] ? rackPDUs["a05"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={189.5}
        />
        <path
          d="M91 183V182H90V183H91ZM133 183H134V182H133V183ZM91 183V184H133V183V182H91V183ZM133 183H132V206H133H134V183H133ZM91 206H92V183H91H90V206H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-39-inside-19_1077_273)"
        />
      </g>

      {/* A06 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a06")}
      >
        <mask id="path-41-inside-20_1077_273" fill="white">
          <path d="M91 206H133V229H91V206Z" />
        </mask>
        <path d="M91 206H133V229H91V206Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A06"
          theme={theme}
          power={rackPDUs["a06"] && rackPDUs["a06"][0] ? rackPDUs["a06"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={212.5}
        />
        <path
          d="M91 206V205H90V206H91ZM133 206H134V205H133V206ZM91 206V207H133V206V205H91V206ZM133 206H132V229H133H134V206H133ZM91 229H92V206H91H90V229H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-41-inside-20_1077_273)"
        />
      </g>

      {/* A07 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a07")}
      >
        <mask id="path-43-inside-21_1077_273" fill="white">
          <path d="M91 229H133V252H91V229Z" />
        </mask>
        <path d="M91 229H133V252H91V229Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A07-1"
          theme={theme}
          power={rackPDUs["a07"] && rackPDUs["a07"][0] ? rackPDUs["a07"][0].reading : undefined}
          size={0.17857}
          x={103}
          y={235.5}
        />
        <Bolt
          rack="A07-2"
          theme={theme}
          power={rackPDUs["a07"] && rackPDUs["a07"][1] ? rackPDUs["a07"][1].reading : undefined}
          size={0.17857}
          x={111}
          y={235.5}
        />
        <path
          d="M91 229V228H90V229H91ZM133 229H134V228H133V229ZM91 229V230H133V229V228H91V229ZM133 229H132V252H133H134V229H133ZM91 252H92V229H91H90V252H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-43-inside-21_1077_273)"
        />
      </g>

      {/* A08 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a08")}
      >
        <mask id="path-45-inside-22_1077_273" fill="white">
          <path d="M91 252H133V275H91V252Z" />
        </mask>
        <path d="M91 252H133V275H91V252Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A08-1"
          theme={theme}
          power={rackPDUs["a08"] && rackPDUs["a08"][0] ? rackPDUs["a08"][0].reading : undefined}
          size={0.17857}
          x={103}
          y={258.5}
        />
        <Bolt
          rack="A08-2"
          theme={theme}
          power={rackPDUs["a08"] && rackPDUs["a08"][1] ? rackPDUs["a08"][1].reading : undefined}
          size={0.17857}
          x={111}
          y={258.5}
        />
        <path
          d="M91 252V251H90V252H91ZM133 252H134V251H133V252ZM91 252V253H133V252V251H91V252ZM133 252H132V275H133H134V252H133ZM91 275H92V252H91H90V275H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-45-inside-22_1077_273)"
        />
      </g>

      {/* A09 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a09")}
      >
        <mask id="path-47-inside-23_1077_273" fill="white">
          <path d="M91 275H133V298H91V275Z" />
        </mask>
        <path d="M91 275H133V298H91V275Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A09"
          theme={theme}
          power={rackPDUs["a09"] && rackPDUs["a09"][0] ? rackPDUs["a09"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={281.5}
        />
        <path
          d="M91 275V274H90V275H91ZM133 275H134V274H133V275ZM91 275V276H133V275V274H91V275ZM133 275H132V298H133H134V275H133ZM91 298H92V275H91H90V298H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-47-inside-23_1077_273)"
        />
      </g>

      {/* A10 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a10")}
      >
        <mask id="path-49-inside-24_1077_273" fill="white">
          <path d="M91 298H133V321H91V298Z" />
        </mask>
        <path d="M91 298H133V321H91V298Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A10"
          theme={theme}
          power={rackPDUs["a10"] && rackPDUs["a10"][0] ? rackPDUs["a10"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={304.5}
        />
        <path
          d="M91 298V297H90V298H91ZM133 298H134V297H133V298ZM91 298V299H133V298V297H91V298ZM133 298H132V321H133H134V298H133ZM91 321H92V298H91H90V321H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-49-inside-24_1077_273)"
        />
      </g>

      {/* A11 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a11")}
      >
        <mask id="path-51-inside-25_1077_273" fill="white">
          <path d="M91 321H133V344H91V321Z" />
        </mask>
        <path d="M91 321H133V344H91V321Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A11-1"
          theme={theme}
          power={rackPDUs["a11"] && rackPDUs["a11"][0] ? rackPDUs["a11"][0].reading : undefined}
          size={0.17857}
          x={103}
          y={327.5}
        />
        <Bolt
          rack="A11-2"
          theme={theme}
          power={rackPDUs["a11"] && rackPDUs["a11"][1] ? rackPDUs["a11"][1].reading : undefined}
          size={0.17857}
          x={111}
          y={327.5}
        />
        <path
          d="M91 321V320H90V321H91ZM133 321H134V320H133V321ZM91 321V322H133V321V320H91V321ZM133 321H132V344H133H134V321H133ZM91 344H92V321H91H90V344H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-51-inside-25_1077_273)"
        />
      </g>

      {/* A12 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a12")}
      >
        <mask id="path-53-inside-26_1077_273" fill="white">
          <path d="M91 344H133V367H91V344Z" />
        </mask>
        <path d="M91 344H133V367H91V344Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A12-1"
          theme={theme}
          power={rackPDUs["a12"] && rackPDUs["a12"][0] ? rackPDUs["a12"][0].reading : undefined}
          size={0.17857}
          x={103}
          y={350.5}
        />
        <Bolt
          rack="A12-2"
          theme={theme}
          power={rackPDUs["a12"] && rackPDUs["a12"][1] ? rackPDUs["a12"][1].reading : undefined}
          size={0.17857}
          x={111}
          y={350.5}
        />
        <path
          d="M91 344V343H90V344H91ZM133 344H134V343H133V344ZM91 344V345H133V344V343H91V344ZM133 344H132V367H133H134V344H133ZM91 367H92V344H91H90V367H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-53-inside-26_1077_273)"
        />
      </g>

      {/* A13 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a13")}
      >
        <mask id="path-55-inside-27_1077_273" fill="white">
          <path d="M91 367H133V390H91V367Z" />
        </mask>
        <path d="M91 367H133V390H91V367Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A13"
          theme={theme}
          power={rackPDUs["a13"] && rackPDUs["a13"][0] ? rackPDUs["a13"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={373.5}
        />
        <path
          d="M91 367V366H90V367H91ZM133 367H134V366H133V367ZM91 367V368H133V367V366H91V367ZM133 367H132V390H133H134V367H133ZM91 390H92V367H91H90V390H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-55-inside-27_1077_273)"
        />
      </g>

      {/* A14 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/a14")}
      >
        <mask id="path-57-inside-28_1077_273" fill="white">
          <path d="M91 390H133V413H91V390Z" />
        </mask>
        <path d="M91 390H133V413H91V390Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="A14"
          theme={theme}
          power={rackPDUs["a14"] && rackPDUs["a14"][0] ? rackPDUs["a14"][0].reading : undefined}
          size={0.17857}
          x={107}
          y={396.5}
        />
        <path
          d="M91 390V389H90V390H91ZM133 390H134V389H133V390ZM133 413V414H134V413H133ZM91 413H90V414H91V413ZM91 390V391H133V390V389H91V390ZM133 390H132V413H133H134V390H133ZM133 413V412H91V413V414H133V413ZM91 413H92V390H91H90V413H91Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-57-inside-28_1077_273)"
        />
      </g>

      {/* ====================== ROW B (B01 - B14) ====================== */}

      {/* B01 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b01")}
      >
        <mask id="path-59-inside-29_1077_273" fill="white">
          <path d="M176 91H218V114H176V91Z" />
        </mask>
        <path d="M176 91H218V114H176V91Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B01-1"
          theme={theme}
          power={rackPDUs["b01"] && rackPDUs["b01"][0] ? rackPDUs["b01"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={97.5}
        />
        <Bolt
          rack="B01-2"
          theme={theme}
          power={rackPDUs["b01"] && rackPDUs["b01"][1] ? rackPDUs["b01"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={97.5}
        />
        <path
          d="M176 91V90H175V91H176ZM218 91H219V90H218V91ZM176 91V92H218V91V90H176V91ZM218 91H217V114H218H219V91H218ZM176 114H177V91H176H175V114H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-59-inside-29_1077_273)"
        />
      </g>

      {/* B02 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b02")}
      >
        <mask id="path-61-inside-30_1077_273" fill="white">
          <path d="M176 114H218V137H176V114Z" />
        </mask>
        <path d="M176 114H218V137H176V114Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B02"
          theme={theme}
          power={rackPDUs["b02"] && rackPDUs["b02"][0] ? rackPDUs["b02"][0].reading : undefined}
          size={0.17857}
          x={192}
          y={120.5}
        />
        <path
          d="M176 114V113H175V114H176ZM218 114H219V113H218V114ZM176 114V115H218V114V113H176V114ZM218 114H217V137H218H219V114H218ZM176 137H177V114H176H175V137H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-61-inside-30_1077_273)"
        />
      </g>

      {/* B03 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b03")}
      >
        <mask id="path-63-inside-31_1077_273" fill="white">
          <path d="M176 137H218V160H176V137Z" />
        </mask>
        <path d="M176 137H218V160H176V137Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B03-1"
          theme={theme}
          power={rackPDUs["b03"] && rackPDUs["b03"][0] ? rackPDUs["b03"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={143.5}
        />
        <Bolt
          rack="B03-2"
          theme={theme}
          power={rackPDUs["b03"] && rackPDUs["b03"][1] ? rackPDUs["b03"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={143.5}
        />
        <path
          d="M176 137V136H175V137H176ZM218 137H219V136H218V137ZM176 137V138H218V137V136H176V137ZM218 137H217V160H218H219V137H218ZM176 160H177V137H176H175V160H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-63-inside-31_1077_273)"
        />
      </g>

      {/* B04 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b04")}
      >
        <mask id="path-65-inside-32_1077_273" fill="white">
          <path d="M176 160H218V183H176V160Z" />
        </mask>
        <path d="M176 160H218V183H176V160Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B04-1"
          theme={theme}
          power={rackPDUs["b04"] && rackPDUs["b04"][0] ? rackPDUs["b04"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={166.5}
        />
        <Bolt
          rack="B04-2"
          theme={theme}
          power={rackPDUs["b04"] && rackPDUs["b04"][1] ? rackPDUs["b04"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={166.5}
        />
        <path
          d="M176 160V159H175V160H176ZM218 160H219V159H218V160ZM176 160V161H218V160V159H176V160ZM218 160H217V183H218H219V160H218ZM176 183H177V160H176H175V183H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-65-inside-32_1077_273)"
        />
      </g>

      {/* B05 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b05")}
      >
        <mask id="path-67-inside-33_1077_273" fill="white">
          <path d="M176 183H218V206H176V183Z" />
        </mask>
        <path d="M176 183H218V206H176V183Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B05-1"
          theme={theme}
          power={rackPDUs["b05"] && rackPDUs["b05"][0] ? rackPDUs["b05"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={189.5}
        />
        <Bolt
          rack="B05-2"
          theme={theme}
          power={rackPDUs["b05"] && rackPDUs["b05"][1] ? rackPDUs["b05"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={189.5}
        />
        <path
          d="M176 183V182H175V183H176ZM218 183H219V182H218V183ZM176 183V184H218V183V182H176V183ZM218 183H217V206H218H219V183H218ZM176 206H177V183H176H175V206H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-67-inside-33_1077_273)"
        />
      </g>

      {/* B06 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b06")}
      >
        <mask id="path-69-inside-34_1077_273" fill="white">
          <path d="M176 206H218V229H176V206Z" />
        </mask>
        <path d="M176 206H218V229H176V206Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B06"
          theme={theme}
          power={rackPDUs["b06"] && rackPDUs["b06"][0] ? rackPDUs["b06"][0].reading : undefined}
          size={0.17857}
          x={192}
          y={212.5}
        />
        <path
          d="M176 206V205H175V206H176ZM218 206H219V205H218V206ZM176 206V207H218V206V205H176V206ZM218 206H217V229H218H219V206H218ZM176 229H177V206H176H175V229H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-69-inside-34_1077_273)"
        />
      </g>

      {/* B07 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b07")}
      >
        <mask id="path-71-inside-35_1077_273" fill="white">
          <path d="M176 229H218V252H176V229Z" />
        </mask>
        <path d="M176 229H218V252H176V229Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B07-1"
          theme={theme}
          power={rackPDUs["b07"] && rackPDUs["b07"][0] ? rackPDUs["b07"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={235.5}
        />
        <Bolt
          rack="B07-2"
          theme={theme}
          power={rackPDUs["b07"] && rackPDUs["b07"][1] ? rackPDUs["b07"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={235.5}
        />
        <path
          d="M176 229V228H175V229H176ZM218 229H219V228H218V229ZM176 229V230H218V229V228H176V229ZM218 229H217V252H218H219V229H218ZM176 252H177V229H176H175V252H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-71-inside-35_1077_273)"
        />
      </g>

      {/* B08 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b08")}
      >
        <mask id="path-73-inside-36_1077_273" fill="white">
          <path d="M176 252H218V275H176V252Z" />
        </mask>
        <path d="M176 252H218V275H176V252Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B08-1"
          theme={theme}
          power={rackPDUs["b08"] && rackPDUs["b08"][0] ? rackPDUs["b08"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={258.5}
        />
        <Bolt
          rack="B08-2"
          theme={theme}
          power={rackPDUs["b08"] && rackPDUs["b08"][1] ? rackPDUs["b08"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={258.5}
        />
        <path
          d="M176 252V251H175V252H176ZM218 252H219V251H218V252ZM176 252V253H218V252V251H176V252ZM218 252H217V275H218H219V252H218ZM176 275H177V252H176H175V275H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-73-inside-36_1077_273)"
        />
      </g>

      {/* B09 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b09")}
      >
        <mask id="path-75-inside-37_1077_273" fill="white">
          <path d="M176 275H218V298H176V275Z" />
        </mask>
        <path d="M176 275H218V298H176V275Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B09-1"
          theme={theme}
          power={rackPDUs["b09"] && rackPDUs["b09"][0] ? rackPDUs["b09"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={281.5}
        />
        <Bolt
          rack="B09-2"
          theme={theme}
          power={rackPDUs["b09"] && rackPDUs["b09"][1] ? rackPDUs["b09"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={281.5}
        />
        <path
          d="M176 275V274H175V275H176ZM218 275H219V274H218V275ZM176 275V276H218V275V274H176V275ZM218 275H217V298H218H219V275H218ZM176 298H177V275H176H175V298H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-75-inside-37_1077_273)"
        />
      </g>

      {/* B10 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b10")}
      >
        <mask id="path-77-inside-38_1077_273" fill="white">
          <path d="M176 298H218V321H176V298Z" />
        </mask>
        <path d="M176 298H218V321H176V298Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B10"
          theme={theme}
          power={rackPDUs["b10"] && rackPDUs["b10"][0] ? rackPDUs["b10"][0].reading : undefined}
          size={0.17857}
          x={192}
          y={304.5}
        />
        <path
          d="M176 298V297H175V298H176ZM218 298H219V297H218V298ZM176 298V299H218V298V297H176V298ZM218 298H217V321H218H219V298H218ZM176 321H177V298H176H175V321H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-77-inside-38_1077_273)"
        />
      </g>

      {/* B11 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b11")}
      >
        <mask id="path-79-inside-39_1077_273" fill="white">
          <path d="M176 321H218V344H176V321Z" />
        </mask>
        <path d="M176 321H218V344H176V321Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B11-1"
          theme={theme}
          power={rackPDUs["b11"] && rackPDUs["b11"][0] ? rackPDUs["b11"][0].reading : undefined}
          size={0.17857}
          x={188}
          y={327.5}
        />
        <Bolt
          rack="B11-2"
          theme={theme}
          power={rackPDUs["b11"] && rackPDUs["b11"][1] ? rackPDUs["b11"][1].reading : undefined}
          size={0.17857}
          x={196}
          y={327.5}
        />
        <path
          d="M176 321V320H175V321H176ZM218 321H219V320H218V321ZM176 321V322H218V321V320H176V321ZM218 321H217V344H218H219V321H218ZM176 344H177V321H176H175V344H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-79-inside-39_1077_273)"
        />
      </g>

      {/* B12 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b12")}
      >
        <mask id="path-81-inside-40_1077_273" fill="white">
          <path d="M176 344H218V367H176V344Z" />
        </mask>
        <path d="M176 344H218V367H176V344Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B12"
          theme={theme}
          power={rackPDUs["b12"] && rackPDUs["b12"][0] ? rackPDUs["b12"][0].reading : undefined}
          size={0.17857}
          x={192}
          y={350.5}
        />
        <path
          d="M176 344V343H175V344H176ZM218 344H219V343H218V344ZM176 344V345H218V344V343H176V344ZM218 344H217V367H218H219V344H218ZM176 367H177V344H176H175V367H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-81-inside-40_1077_273)"
        />
      </g>

      {/* B13 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b13")}
      >
        <mask id="path-83-inside-41_1077_273" fill="white">
          <path d="M176 367H218V390H176V367Z" />
        </mask>
        <path d="M176 367H218V390H176V367Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B13"
          theme={theme}
          power={rackPDUs["b13"] && rackPDUs["b13"][0] ? rackPDUs["b13"][0].reading : undefined}
          size={0.17857}
          x={192}
          y={373.5}
        />
        <path
          d="M176 367V366H175V367H176ZM218 367H219V366H218V367ZM176 367V368H218V367V366H176V367ZM218 367H217V390H218H219V367H218ZM176 390H177V367H176H175V390H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-83-inside-41_1077_273)"
        />
      </g>

      {/* B14 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/b14")}
      >
        <mask id="path-85-inside-42_1077_273" fill="white">
          <path d="M176 390H218V413H176V390Z" />
        </mask>
        <path d="M176 390H218V413H176V390Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="B14"
          theme={theme}
          power={rackPDUs["b14"] && rackPDUs["b14"][0] ? rackPDUs["b14"][0].reading : undefined}
          size={0.17857}
          x={192}
          y={396.5}
        />
        <path
          d="M176 390V389H175V390H176ZM218 390H219V389H218V390ZM218 413V414H219V413H218ZM176 413H175V414H176V413ZM176 390V391H218V390V389H176V390ZM218 390H217V413H218H219V390H218ZM218 413V412H176V413V414H218V413ZM176 413H177V390H176H175V413H176Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-85-inside-42_1077_273)"
        />
      </g>

      {/* ====================== ROW C (C01 - C14) ====================== */}

      {/* C01 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c01")}
      >
        <mask id="path-3-inside-1_1077_273" fill="white">
          <path d="M367 91H409V114H367V91Z" />
        </mask>
        <path d="M367 91H409V114H367V91Z" fill={colorConfig.block_fill} />
        {/*
        <Bolt
          rack="C01"
          theme={theme}
          power={rackPDUs["c01"] && rackPDUs["c01"][0] ? rackPDUs["c01"][0].reading : undefined}
          size={0.17857}
          x={383}
          y={97.5}
        />
        */}
        <path
          d="M367 91V90H366V91H367ZM409 91H410V90H409V91ZM367 91V92H409V91V90H367V91ZM409 91H408V114H409H410V91H409ZM367 114H368V91H367H366V114H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-3-inside-1_1077_273)"
        />
      </g>

      {/* C02 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c02")}
      >
        <mask id="path-5-inside-2_1077_273" fill="white">
          <path d="M367 114H409V137H367V114Z" />
        </mask>
        <path d="M367 114H409V137H367V114Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C02"
          theme={theme}
          power={rackPDUs["c02"] && rackPDUs["c02"][0] ? rackPDUs["c02"][0].reading : undefined}
          size={0.17857}
          x={383}
          y={120.5}
        />
        <path
          d="M367 114V113H366V114H367ZM409 114H410V113H409V114ZM367 114V115H409V114V113H367V114ZM409 114H408V137H409H410V114H409ZM367 137H368V114H367H366V137H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-5-inside-2_1077_273)"
        />
      </g>

      {/* C03 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c03")}
      >
        <mask id="path-7-inside-3_1077_273" fill="white">
          <path d="M367 137H409V160H367V137Z" />
        </mask>
        <path d="M367 137H409V160H367V137Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C03-1"
          theme={theme}
          power={rackPDUs["c03"] && rackPDUs["c03"][0] ? rackPDUs["c03"][0].reading : undefined}
          size={0.17857}
          x={379}
          y={143.5}
        />
        <Bolt
          rack="C03-2"
          theme={theme}
          power={rackPDUs["c03"] && rackPDUs["c03"][1] ? rackPDUs["c03"][1].reading : undefined}
          size={0.17857}
          x={387}
          y={143.5}
        />
        <path
          d="M367 137V136H366V137H367ZM409 137H410V136H409V137ZM367 137V138H409V137V136H367V137ZM409 137H408V160H409H410V137H409ZM367 160H368V137H367H366V160H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-7-inside-3_1077_273)"
        />
      </g>

      {/* C04 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c04")}
      >
        <mask id="path-9-inside-4_1077_273" fill="white">
          <path d="M367 160H409V183H367V160Z" />
        </mask>
        <path d="M367 160H409V183H367V160Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C04-1"
          theme={theme}
          power={rackPDUs["c04"] && rackPDUs["c04"][0] ? rackPDUs["c04"][0].reading : undefined}
          size={0.17857}
          x={379}
          y={166.5}
        />
        <Bolt
          rack="C04-2"
          theme={theme}
          power={rackPDUs["c04"] && rackPDUs["c04"][1] ? rackPDUs["c04"][1].reading : undefined}
          size={0.17857}
          x={387}
          y={166.5}
        />
        <path
          d="M367 160V159H366V160H367ZM409 160H410V159H409V160ZM367 160V161H409V160V159H367V160ZM409 160H408V183H409H410V160H409ZM367 183H368V160H367H366V183H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-9-inside-4_1077_273)"
        />
      </g>

      {/* C05 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c05")}
      >
        <mask id="path-11-inside-5_1077_273" fill="white">
          <path d="M367 183H409V206H367V183Z" />
        </mask>
        <path d="M367 183H409V206H367V183Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C05-1"
          theme={theme}
          power={rackPDUs["c05"] && rackPDUs["c05"][0] ? rackPDUs["c05"][0].reading : undefined}
          size={0.17857}
          x={379}
          y={189.5}
        />
        <Bolt
          rack="C05-2"
          theme={theme}
          power={rackPDUs["c05"] && rackPDUs["c05"][1] ? rackPDUs["c05"][1].reading : undefined}
          size={0.17857}
          x={387}
          y={189.5}
        />
        <path
          d="M367 183V182H366V183H367ZM409 183H410V182H409V183ZM367 183V184H409V183V182H367V183ZM409 183H408V206H409H410V183H409ZM367 206H368V183H367H366V206H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-11-inside-5_1077_273)"
        />
      </g>

      {/* C06 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c06")}
      >
        <mask id="path-13-inside-6_1077_273" fill="white">
          <path d="M367 206H409V229H367V206Z" />
        </mask>
        <path d="M367 206H409V229H367V206Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C06"
          theme={theme}
          power={rackPDUs["c06"] && rackPDUs["c06"][0] ? rackPDUs["c06"][0].reading : undefined}
          size={0.17857}
          x={383}
          y={212.5}
        />
        <path
          d="M367 206V205H366V206H367ZM409 206H410V205H409V206ZM367 206V207H409V206V205H367V206ZM409 206H408V229H409H410V206H409ZM367 229H368V206H367H366V229H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-13-inside-6_1077_273)"
        />
      </g>

      {/* C07 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c07")}
      >
        <mask id="path-15-inside-7_1077_273" fill="white">
          <path d="M367 229H409V252H367V229Z" />
        </mask>
        <path d="M367 229H409V252H367V229Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C07-1"
          theme={theme}
          power={rackPDUs["c07"] && rackPDUs["c07"][0] ? rackPDUs["c07"][0].reading : undefined}
          size={0.17857}
          x={379}
          y={235.5}
        />
        <Bolt
          rack="C07-2"
          theme={theme}
          power={rackPDUs["c07"] && rackPDUs["c07"][1] ? rackPDUs["c07"][1].reading : undefined}
          size={0.17857}
          x={387}
          y={235.5}
        />
        <path
          d="M367 229V228H366V229H367ZM409 229H410V228H409V229ZM367 229V230H409V229V228H367V229ZM409 229H408V252H409H410V229H409ZM367 252H368V229H367H366V252H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-15-inside-7_1077_273)"
        />
      </g>

      {/* C08 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c08")}
      >
        <mask id="path-17-inside-8_1077_273" fill="white">
          <path d="M367 252H409V275H367V252Z" />
        </mask>
        <path d="M367 252H409V275H367V252Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C08-1"
          theme={theme}
          power={rackPDUs["c08"] && rackPDUs["c08"][0] ? rackPDUs["c08"][0].reading : undefined}
          size={0.17857}
          x={379}
          y={258.5}
        />
        <Bolt
          rack="C08-2"
          theme={theme}
          power={rackPDUs["c08"] && rackPDUs["c08"][1] ? rackPDUs["c08"][1].reading : undefined}
          size={0.17857}
          x={387}
          y={258.5}
        />
        <path
          d="M367 252V251H366V252H367ZM409 252H410V251H409V252ZM367 252V253H409V252V251H367V252ZM409 252H408V275H409H410V252H409ZM367 275H368V252H367H366V275H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-17-inside-8_1077_273)"
        />
      </g>

      {/* C09 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c09")}
      >
        <mask id="path-19-inside-9_1077_273" fill="white">
          <path d="M367 275H409V298H367V275Z" />
        </mask>
        <path d="M367 275H409V298H367V275Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C09-1"
          theme={theme}
          power={rackPDUs["c09"] && rackPDUs["c09"][0] ? rackPDUs["c09"][0].reading : undefined}
          size={0.17857}
          x={379}
          y={281.5}
        />
        <Bolt
          rack="C09-2"
          theme={theme}
          power={rackPDUs["c09"] && rackPDUs["c09"][1] ? rackPDUs["c09"][1].reading : undefined}
          size={0.17857}
          x={387}
          y={281.5}
        />
        <path
          d="M367 275V274H366V275H367ZM409 275H410V274H409V275ZM367 275V276H409V275V274H367V275ZM409 275H408V298H409H410V275H409ZM367 298H368V275H367H366V298H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-19-inside-9_1077_273)"
        />
      </g>

      {/* C10 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c10")}
      >
        <mask id="path-21-inside-10_1077_273" fill="white">
          <path d="M367 298H409V321H367V298Z" />
        </mask>
        <path d="M367 298H409V321H367V298Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C10"
          theme={theme}
          power={rackPDUs["c10"] && rackPDUs["c10"][0] ? rackPDUs["c10"][0].reading : undefined}
          size={0.17857}
          x={383}
          y={304.5}
        />
        <path
          d="M367 298V297H366V298H367ZM409 298H410V297H409V298ZM367 298V299H409V298V297H367V298ZM409 298H408V321H409H410V298H409ZM367 321H368V298H367H366V321H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-21-inside-10_1077_273)"
        />
      </g>

      {/* C11 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c11")}
      >
        <mask id="path-23-inside-11_1077_273" fill="white">
          <path d="M367 321H409V344H367V321Z" />
        </mask>
        <path d="M367 321H409V344H367V321Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C11"
          theme={theme}
          power={rackPDUs["c11"] && rackPDUs["c11"][0] ? rackPDUs["c11"][0].reading : undefined}
          size={0.17857}
          x={383}
          y={327.5}
        />
        <path
          d="M367 321V320H366V321H367ZM409 321H410V320H409V321ZM367 321V322H409V321V320H367V321ZM409 321H408V344H409H410V321H409ZM367 344H368V321H367H366V344H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-23-inside-11_1077_273)"
        />
      </g>

      {/* C12 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c12")}
      >
        <mask id="path-25-inside-12_1077_273" fill="white">
          <path d="M367 344H409V367H367V344Z" />
        </mask>
        <path d="M367 344H409V367H367V344Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C12-1"
          theme={theme}
          power={rackPDUs["c12"] && rackPDUs["c12"][0] ? rackPDUs["c12"][0].reading : undefined}
          size={0.17857}
          x={379}
          y={350.5}
        />
        <Bolt
          rack="C12-2"
          theme={theme}
          power={rackPDUs["c12"] && rackPDUs["c12"][1] ? rackPDUs["c12"][1].reading : undefined}
          size={0.17857}
          x={387}
          y={350.5}
        />
        <path
          d="M367 344V343H366V344H367ZM409 344H410V343H409V344ZM367 344V345H409V344V343H367V344ZM409 344H408V367H409H410V344H409ZM367 367H368V344H367H366V367H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-25-inside-12_1077_273)"
        />
      </g>

      {/* C13 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c13")}
      >
        <mask id="path-27-inside-13_1077_273" fill="white">
          <path d="M367 367H409V390H367V367Z" />
        </mask>
        <path d="M367 367H409V390H367V367Z" fill={colorConfig.block_fill} />
        <Bolt
          rack="C13"
          theme={theme}
          power={rackPDUs["c13"] && rackPDUs["c13"][0] ? rackPDUs["c13"][0].reading : undefined}
          size={0.17857}
          x={383}
          y={373.5}
        />
        <path
          d="M367 367V366H366V367H367ZM409 367H410V366H409V367ZM367 367V368H409V367V366H367V367ZM409 367H408V390H409H410V367H409ZM367 390H368V367H367H366V390H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-27-inside-13_1077_273)"
        />
      </g>

      {/* C14 */}
      <g
        className="cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
        onClick={() => router.push("/opendc/dh2/power/c14")}
      >
        <mask id="path-29-inside-14_1077_273" fill="white">
          <path d="M367 390H409V413H367V390Z" />
        </mask>
        <path d="M367 390H409V413H367V390Z" fill={colorConfig.block_fill} />
        {/*
        <Bolt
          rack="C14"
          theme={theme}
          power={rackPDUs["c14"] && rackPDUs["c14"][0] ? rackPDUs["c14"][0].reading : undefined}
          size={0.17857}
          x={383}
          y={396.5}
        />
        */}
        <path
          d="M367 390V389H366V390H367ZM409 390H410V389H409V390ZM409 413V414H410V413H409ZM367 413H366V414H367V413ZM367 390V391H409V390V389H367V390ZM409 390H408V413H409H410V390H409ZM409 413V412H367V413V414H409V413ZM367 413H368V390H367H366V413H367Z"
          fill={colorConfig.block_stroke}
          mask="url(#path-29-inside-14_1077_273)"
        />
      </g>



      {/* CRAC-1 */}
      <g mask="url(#semicircle-mask-1)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={134}
          startY={45}
        />
      </g>
      <rect
        x="134.5"
        y="1.5"
        width="83"
        height="40"
        fill={colorConfig.block_fill}
      />
      <rect
        x="134.5"
        y="1.5"
        width="83"
        height="40"
        stroke={colorConfig.block_stroke}
      />
      <path
        d="M168.312 20.1811H166.983C166.946 19.9633 166.876 19.7704 166.774 19.6023C166.672 19.4318 166.546 19.2874 166.394 19.169C166.242 19.0507 166.07 18.9619 165.876 18.9027C165.684 18.8411 165.477 18.8104 165.254 18.8104C164.859 18.8104 164.508 18.9098 164.203 19.1087C163.898 19.3052 163.658 19.594 163.486 19.9751C163.313 20.3539 163.226 20.8168 163.226 21.3636C163.226 21.92 163.313 22.3887 163.486 22.7699C163.661 23.1487 163.9 23.4351 164.203 23.6293C164.508 23.821 164.858 23.9169 165.251 23.9169C165.468 23.9169 165.672 23.8885 165.861 23.8317C166.053 23.7725 166.225 23.6861 166.376 23.5724C166.53 23.4588 166.659 23.3191 166.763 23.1534C166.87 22.9877 166.943 22.7983 166.983 22.5852L168.312 22.5923C168.262 22.938 168.154 23.2623 167.988 23.5653C167.825 23.8684 167.611 24.1359 167.346 24.3679C167.081 24.5975 166.77 24.7775 166.415 24.9077C166.06 25.0355 165.666 25.0994 165.233 25.0994C164.594 25.0994 164.023 24.9515 163.521 24.6555C163.019 24.3596 162.624 23.9323 162.335 23.3736C162.046 22.8149 161.902 22.1449 161.902 21.3636C161.902 20.58 162.047 19.91 162.339 19.3537C162.63 18.795 163.026 18.3677 163.528 18.0717C164.03 17.7758 164.598 17.6278 165.233 17.6278C165.638 17.6278 166.014 17.6847 166.362 17.7983C166.71 17.9119 167.02 18.0788 167.292 18.299C167.565 18.5168 167.788 18.7843 167.964 19.1016C168.141 19.4164 168.257 19.7763 168.312 20.1811ZM169.518 25V17.7273H172.245C172.804 17.7273 173.273 17.8243 173.652 18.0185C174.033 18.2126 174.32 18.4848 174.515 18.8352C174.711 19.1832 174.809 19.5893 174.809 20.0533C174.809 20.5196 174.71 20.9245 174.511 21.2678C174.315 21.6087 174.025 21.8726 173.641 22.0597C173.257 22.2443 172.786 22.3366 172.228 22.3366H170.285V21.2429H172.05C172.377 21.2429 172.644 21.1979 172.853 21.108C173.061 21.0156 173.215 20.8819 173.314 20.7067C173.416 20.5291 173.467 20.3113 173.467 20.0533C173.467 19.7952 173.416 19.575 173.314 19.3928C173.212 19.2081 173.057 19.0684 172.849 18.9737C172.641 18.8767 172.372 18.8281 172.043 18.8281H170.836V25H169.518ZM173.275 21.7045L175.076 25H173.605L171.837 21.7045H173.275ZM176.956 25H175.55L178.11 17.7273H179.737L182.3 25H180.894L178.952 19.2188H178.895L176.956 25ZM177.002 22.1484H180.837V23.2067H177.002V22.1484ZM189.142 20.1811H187.814C187.776 19.9633 187.706 19.7704 187.604 19.6023C187.502 19.4318 187.376 19.2874 187.224 19.169C187.073 19.0507 186.9 18.9619 186.706 18.9027C186.514 18.8411 186.307 18.8104 186.084 18.8104C185.689 18.8104 185.338 18.9098 185.033 19.1087C184.728 19.3052 184.489 19.594 184.316 19.9751C184.143 20.3539 184.056 20.8168 184.056 21.3636C184.056 21.92 184.143 22.3887 184.316 22.7699C184.491 23.1487 184.73 23.4351 185.033 23.6293C185.338 23.821 185.688 23.9169 186.081 23.9169C186.298 23.9169 186.502 23.8885 186.691 23.8317C186.883 23.7725 187.055 23.6861 187.206 23.5724C187.36 23.4588 187.489 23.3191 187.593 23.1534C187.7 22.9877 187.773 22.7983 187.814 22.5852L189.142 22.5923C189.092 22.938 188.984 23.2623 188.819 23.5653C188.655 23.8684 188.441 24.1359 188.176 24.3679C187.911 24.5975 187.6 24.7775 187.245 24.9077C186.89 25.0355 186.496 25.0994 186.063 25.0994C185.424 25.0994 184.853 24.9515 184.351 24.6555C183.849 24.3596 183.454 23.9323 183.165 23.3736C182.876 22.8149 182.732 22.1449 182.732 21.3636C182.732 20.58 182.877 19.91 183.169 19.3537C183.46 18.795 183.856 18.3677 184.358 18.0717C184.86 17.7758 185.428 17.6278 186.063 17.6278C186.468 17.6278 186.844 17.6847 187.192 17.7983C187.54 17.9119 187.85 18.0788 188.123 18.299C188.395 18.5168 188.618 18.7843 188.794 19.1016C188.971 19.4164 189.087 19.7763 189.142 20.1811Z"
        fill={colorConfig.text}
      />
      {/* CRAC-2 */}
      <g mask="url(#semicircle-mask-2)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={360}
          startY={45}
        />
      </g>
      <rect
        x="360.5"
        y="1.5"
        width="83"
        height="40"
        fill={colorConfig.block_fill}
      />
      <rect
        x="360.5"
        y="1.5"
        width="83"
        height="40"
        stroke={colorConfig.block_stroke}
      />
      <path
        d="M394.312 20.1811H392.983C392.946 19.9633 392.876 19.7704 392.774 19.6023C392.672 19.4318 392.546 19.2874 392.394 19.169C392.242 19.0507 392.07 18.9619 391.876 18.9027C391.684 18.8411 391.477 18.8104 391.254 18.8104C390.859 18.8104 390.508 18.9098 390.203 19.1087C389.898 19.3052 389.658 19.594 389.486 19.9751C389.313 20.3539 389.226 20.8168 389.226 21.3636C389.226 21.92 389.313 22.3887 389.486 22.7699C389.661 23.1487 389.9 23.4351 390.203 23.6293C390.508 23.821 390.858 23.9169 391.251 23.9169C391.468 23.9169 391.672 23.8885 391.861 23.8317C392.053 23.7725 392.225 23.6861 392.376 23.5724C392.53 23.4588 392.659 23.3191 392.763 23.1534C392.87 22.9877 392.943 22.7983 392.983 22.5852L394.312 22.5923C394.262 22.938 394.154 23.2623 393.988 23.5653C393.825 23.8684 393.611 24.1359 393.346 24.3679C393.081 24.5975 392.77 24.7775 392.415 24.9077C392.06 25.0355 391.666 25.0994 391.233 25.0994C390.594 25.0994 390.023 24.9515 389.521 24.6555C389.019 24.3596 388.624 23.9323 388.335 23.3736C388.046 22.8149 387.902 22.1449 387.902 21.3636C387.902 20.58 388.047 19.91 388.339 19.3537C388.63 18.795 389.026 18.3677 389.528 18.0717C390.03 17.7758 390.598 17.6278 391.233 17.6278C391.638 17.6278 392.014 17.6847 392.362 17.7983C392.71 17.9119 393.02 18.0788 393.292 18.299C393.565 18.5168 393.788 18.7843 393.964 19.1016C394.141 19.4164 394.257 19.7763 394.312 20.1811ZM395.518 25V17.7273H398.245C398.804 17.7273 399.273 17.8243 399.652 18.0185C400.033 18.2126 400.32 18.4848 400.515 18.8352C400.711 19.1832 400.809 19.5893 400.809 20.0533C400.809 20.5196 400.71 20.9245 400.511 21.2678C400.315 21.6087 400.025 21.8726 399.641 22.0597C399.257 22.2443 398.786 22.3366 398.228 22.3366H396.285V21.2429H398.05C398.377 21.2429 398.644 21.1979 398.853 21.108C399.061 21.0156 399.215 20.8819 399.314 20.7067C399.416 20.5291 399.467 20.3113 399.467 20.0533C399.467 19.7952 399.416 19.575 399.314 19.3928C399.212 19.2081 399.057 19.0684 398.849 18.9737C398.641 18.8767 398.372 18.8281 398.043 18.8281H396.836V25H395.518ZM399.275 21.7045L401.076 25H399.605L397.837 21.7045H399.275ZM402.956 25H401.55L404.11 17.7273H405.737L408.3 25H406.894L404.952 19.2188H404.895L402.956 25ZM403.002 22.1484H406.837V23.2067H403.002V22.1484ZM415.142 20.1811H413.814C413.776 19.9633 413.706 19.7704 413.604 19.6023C413.502 19.4318 413.376 19.2874 413.224 19.169C413.073 19.0507 412.9 18.9619 412.706 18.9027C412.514 18.8411 412.307 18.8104 412.084 18.8104C411.689 18.8104 411.338 18.9098 411.033 19.1087C410.728 19.3052 410.489 19.594 410.316 19.9751C410.143 20.3539 410.056 20.8168 410.056 21.3636C410.056 21.92 410.143 22.3887 410.316 22.7699C410.491 23.1487 410.73 23.4351 411.033 23.6293C411.338 23.821 411.688 23.9169 412.081 23.9169C412.298 23.9169 412.502 23.8885 412.691 23.8317C412.883 23.7725 413.055 23.6861 413.206 23.5724C413.36 23.4588 413.489 23.3191 413.593 23.1534C413.7 22.9877 413.773 22.7983 413.814 22.5852L415.142 22.5923C415.092 22.938 414.984 23.2623 414.819 23.5653C414.655 23.8684 414.441 24.1359 414.176 24.3679C413.911 24.5975 413.6 24.7775 413.245 24.9077C412.89 25.0355 412.496 25.0994 412.063 25.0994C411.424 25.0994 410.853 24.9515 410.351 24.6555C409.849 24.3596 409.454 23.9323 409.165 23.3736C408.876 22.8149 408.732 22.1449 408.732 21.3636C408.732 20.58 408.877 19.91 409.169 19.3537C409.46 18.795 409.856 18.3677 410.358 18.0717C410.86 17.7758 411.428 17.6278 412.063 17.6278C412.468 17.6278 412.844 17.6847 413.192 17.7983C413.54 17.9119 413.85 18.0788 414.123 18.299C414.395 18.5168 414.618 18.7843 414.794 19.1016C414.971 19.4164 415.087 19.7763 415.142 20.1811Z"
        fill={colorConfig.text}
      />
      {/* CRAC-3 */}
      <g mask="url(#semicircle-mask-3)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={247}
          startY={45}
        />
      </g>
      <rect
        x="247.5"
        y="1.5"
        width="83"
        height="40"
        fill={colorConfig.block_fill}
      />
      <rect
        x="247.5"
        y="1.5"
        width="83"
        height="40"
        stroke={colorConfig.block_stroke}
      />
      <path
        d="M281.312 20.1811H279.983C279.946 19.9633 279.876 19.7704 279.774 19.6023C279.672 19.4318 279.546 19.2874 279.394 19.169C279.242 19.0507 279.07 18.9619 278.876 18.9027C278.684 18.8411 278.477 18.8104 278.254 18.8104C277.859 18.8104 277.508 18.9098 277.203 19.1087C276.898 19.3052 276.658 19.594 276.486 19.9751C276.313 20.3539 276.226 20.8168 276.226 21.3636C276.226 21.92 276.313 22.3887 276.486 22.7699C276.661 23.1487 276.9 23.4351 277.203 23.6293C277.508 23.821 277.858 23.9169 278.251 23.9169C278.468 23.9169 278.672 23.8885 278.861 23.8317C279.053 23.7725 279.225 23.6861 279.376 23.5724C279.53 23.4588 279.659 23.3191 279.763 23.1534C279.87 22.9877 279.943 22.7983 279.983 22.5852L281.312 22.5923C281.262 22.938 281.154 23.2623 280.988 23.5653C280.825 23.8684 280.611 24.1359 280.346 24.3679C280.081 24.5975 279.77 24.7775 279.415 24.9077C279.06 25.0355 278.666 25.0994 278.233 25.0994C277.594 25.0994 277.023 24.9515 276.521 24.6555C276.019 24.3596 275.624 23.9323 275.335 23.3736C275.046 22.8149 274.902 22.1449 274.902 21.3636C274.902 20.58 275.047 19.91 275.339 19.3537C275.63 18.795 276.026 18.3677 276.528 18.0717C277.03 17.7758 277.598 17.6278 278.233 17.6278C278.638 17.6278 279.014 17.6847 279.362 17.7983C279.71 17.9119 280.02 18.0788 280.292 18.299C280.565 18.5168 280.788 18.7843 280.964 19.1016C281.141 19.4164 281.257 19.7763 281.312 20.1811ZM282.518 25V17.7273H285.245C285.804 17.7273 286.273 17.8243 286.652 18.0185C287.033 18.2126 287.32 18.4848 287.515 18.8352C287.711 19.1832 287.809 19.5893 287.809 20.0533C287.809 20.5196 287.71 20.9245 287.511 21.2678C287.315 21.6087 287.025 21.8726 286.641 22.0597C286.257 22.2443 285.786 22.3366 285.228 22.3366H283.285V21.2429H285.05C285.377 21.2429 285.644 21.1979 285.853 21.108C286.061 21.0156 286.215 20.8819 286.314 20.7067C286.416 20.5291 286.467 20.3113 286.467 20.0533C286.467 19.7952 286.416 19.575 286.314 19.3928C286.212 19.2081 286.057 19.0684 285.849 18.9737C285.641 18.8767 285.372 18.8281 285.043 18.8281H283.836V25H282.518ZM286.275 21.7045L288.076 25H286.605L284.837 21.7045H286.275ZM289.956 25H288.55L291.11 17.7273H292.737L295.3 25H293.894L291.952 19.2188H291.895L289.956 25ZM290.002 22.1484H293.837V23.2067H290.002V22.1484ZM302.142 20.1811H300.814C300.776 19.9633 300.706 19.7704 300.604 19.6023C300.502 19.4318 300.376 19.2874 300.224 19.169C300.073 19.0507 299.9 18.9619 299.706 18.9027C299.514 18.8411 299.307 18.8104 299.084 18.8104C298.689 18.8104 298.338 18.9098 298.033 19.1087C297.728 19.3052 297.489 19.594 297.316 19.9751C297.143 20.3539 297.056 20.8168 297.056 21.3636C297.056 21.92 297.143 22.3887 297.316 22.7699C297.491 23.1487 297.73 23.4351 298.033 23.6293C298.338 23.821 298.688 23.9169 299.081 23.9169C299.298 23.9169 299.502 23.8885 299.691 23.8317C299.883 23.7725 300.055 23.6861 300.206 23.5724C300.36 23.4588 300.489 23.3191 300.593 23.1534C300.7 22.9877 300.773 22.7983 300.814 22.5852L302.142 22.5923C302.092 22.938 301.984 23.2623 301.819 23.5653C301.655 23.8684 301.441 24.1359 301.176 24.3679C300.911 24.5975 300.6 24.7775 300.245 24.9077C299.89 25.0355 299.496 25.0994 299.063 25.0994C298.424 25.0994 297.853 24.9515 297.351 24.6555C296.849 24.3596 296.454 23.9323 296.165 23.3736C295.876 22.8149 295.732 22.1449 295.732 21.3636C295.732 20.58 295.877 19.91 296.169 19.3537C296.46 18.795 296.856 18.3677 297.358 18.0717C297.86 17.7758 298.428 17.6278 299.063 17.6278C299.468 17.6278 299.844 17.6847 300.192 17.7983C300.54 17.9119 300.85 18.0788 301.123 18.299C301.395 18.5168 301.618 18.7843 301.794 19.1016C301.971 19.4164 302.087 19.7763 302.142 20.1811Z"
        fill={colorConfig.text}
      />
      {/* CRAC-4 */}
      <g mask="url(#semicircle-mask-4)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={21}
          startY={45}
        />
      </g>
      <rect
        x="21.5"
        y="1.5"
        width="83"
        height="40"
        fill={colorConfig.block_fill}
      />
      <rect
        x="21.5"
        y="1.5"
        width="83"
        height="40"
        stroke={colorConfig.block_stroke}
      />
      <path
        d="M55.3116 20.1811H53.9835C53.9456 19.9633 53.8758 19.7704 53.774 19.6023C53.6722 19.4318 53.5455 19.2874 53.394 19.169C53.2425 19.0507 53.0697 18.9619 52.8755 18.9027C52.6838 18.8411 52.4766 18.8104 52.2541 18.8104C51.8587 18.8104 51.5083 18.9098 51.2029 19.1087C50.8975 19.3052 50.6584 19.594 50.4856 19.9751C50.3128 20.3539 50.2264 20.8168 50.2264 21.3636C50.2264 21.92 50.3128 22.3887 50.4856 22.7699C50.6608 23.1487 50.8999 23.4351 51.2029 23.6293C51.5083 23.821 51.8575 23.9169 52.2505 23.9169C52.4683 23.9169 52.6719 23.8885 52.8613 23.8317C53.0531 23.7725 53.2247 23.6861 53.3762 23.5724C53.5301 23.4588 53.6592 23.3191 53.7633 23.1534C53.8699 22.9877 53.9432 22.7983 53.9835 22.5852L55.3116 22.5923C55.2619 22.938 55.1542 23.2623 54.9885 23.5653C54.8251 23.8684 54.6109 24.1359 54.3457 24.3679C54.0806 24.5975 53.7704 24.7775 53.4153 24.9077C53.0602 25.0355 52.666 25.0994 52.2328 25.0994C51.5936 25.0994 51.023 24.9515 50.5211 24.6555C50.0192 24.3596 49.6239 23.9323 49.335 23.3736C49.0462 22.8149 48.9018 22.1449 48.9018 21.3636C48.9018 20.58 49.0474 19.91 49.3386 19.3537C49.6298 18.795 50.0263 18.3677 50.5282 18.0717C51.0301 17.7758 51.5983 17.6278 52.2328 17.6278C52.6376 17.6278 53.014 17.6847 53.362 17.7983C53.71 17.9119 54.0202 18.0788 54.2924 18.299C54.5647 18.5168 54.7884 18.7843 54.9636 19.1016C55.1412 19.4164 55.2572 19.7763 55.3116 20.1811ZM56.5181 25V17.7273H59.2454C59.8041 17.7273 60.2728 17.8243 60.6516 18.0185C61.0328 18.2126 61.3204 18.4848 61.5146 18.8352C61.7111 19.1832 61.8093 19.5893 61.8093 20.0533C61.8093 20.5196 61.7099 20.9245 61.511 21.2678C61.3145 21.6087 61.0245 21.8726 60.641 22.0597C60.2575 22.2443 59.7863 22.3366 59.2276 22.3366H57.2852V21.2429H59.0501C59.3768 21.2429 59.6443 21.1979 59.8526 21.108C60.061 21.0156 60.2148 20.8819 60.3143 20.7067C60.4161 20.5291 60.467 20.3113 60.467 20.0533C60.467 19.7952 60.4161 19.575 60.3143 19.3928C60.2125 19.2081 60.0574 19.0684 59.8491 18.9737C59.6407 18.8767 59.372 18.8281 59.043 18.8281H57.8356V25H56.5181ZM60.2752 21.7045L62.0756 25H60.6055L58.837 21.7045H60.2752ZM63.956 25H62.5497L65.1101 17.7273H66.7365L69.3004 25H67.8942L65.9517 19.2188H65.8949L63.956 25ZM64.0021 22.1484H67.8374V23.2067H64.0021V22.1484ZM76.1417 20.1811H74.8136C74.7757 19.9633 74.7058 19.7704 74.604 19.6023C74.5022 19.4318 74.3756 19.2874 74.2241 19.169C74.0726 19.0507 73.8997 18.9619 73.7056 18.9027C73.5138 18.8411 73.3067 18.8104 73.0842 18.8104C72.6888 18.8104 72.3384 18.9098 72.033 19.1087C71.7276 19.3052 71.4885 19.594 71.3157 19.9751C71.1429 20.3539 71.0565 20.8168 71.0565 21.3636C71.0565 21.92 71.1429 22.3887 71.3157 22.7699C71.4909 23.1487 71.73 23.4351 72.033 23.6293C72.3384 23.821 72.6876 23.9169 73.0806 23.9169C73.2984 23.9169 73.502 23.8885 73.6914 23.8317C73.8832 23.7725 74.0548 23.6861 74.2063 23.5724C74.3602 23.4588 74.4892 23.3191 74.5934 23.1534C74.6999 22.9877 74.7733 22.7983 74.8136 22.5852L76.1417 22.5923C76.092 22.938 75.9843 23.2623 75.8185 23.5653C75.6552 23.8684 75.4409 24.1359 75.1758 24.3679C74.9106 24.5975 74.6005 24.7775 74.2454 24.9077C73.8903 25.0355 73.4961 25.0994 73.0629 25.0994C72.4237 25.0994 71.8531 24.9515 71.3512 24.6555C70.8493 24.3596 70.454 23.9323 70.1651 23.3736C69.8763 22.8149 69.7319 22.1449 69.7319 21.3636C69.7319 20.58 69.8775 19.91 70.1687 19.3537C70.4599 18.795 70.8564 18.3677 71.3583 18.0717C71.8602 17.7758 72.4284 17.6278 73.0629 17.6278C73.4677 17.6278 73.8441 17.6847 74.1921 17.7983C74.5401 17.9119 74.8503 18.0788 75.1225 18.299C75.3948 18.5168 75.6185 18.7843 75.7937 19.1016C75.9712 19.4164 76.0872 19.7763 76.1417 20.1811Z"
        fill={colorConfig.text}
      />
      <mask id="path-95-inside-43_1077_273" fill="white">
        <path d="M37 466H121V507H37V466Z" />
      </mask>
      {/* CRAC-5 */}
      <g mask="url(#semicircle-mask-5)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={37}
          startY={450}
        />
      </g>
      <path d="M37 466H121V507H37V466Z" fill={colorConfig.block_fill} />
      <path
        d="M37 466V465H36V466H37ZM121 466H122V465H121V466ZM37 466V467H121V466V465H37V466ZM121 466H120V507H121H122V466H121ZM37 507H38V466H37H36V507H37Z"
        fill={colorConfig.block_stroke}
        mask="url(#path-95-inside-43_1077_273)"
      />
      <path
        d="M71.3116 485.181H69.9835C69.9456 484.963 69.8758 484.77 69.774 484.602C69.6722 484.432 69.5455 484.287 69.394 484.169C69.2425 484.051 69.0697 483.962 68.8755 483.903C68.6838 483.841 68.4766 483.81 68.2541 483.81C67.8587 483.81 67.5083 483.91 67.2029 484.109C66.8975 484.305 66.6584 484.594 66.4856 484.975C66.3128 485.354 66.2264 485.817 66.2264 486.364C66.2264 486.92 66.3128 487.389 66.4856 487.77C66.6608 488.149 66.8999 488.435 67.2029 488.629C67.5083 488.821 67.8575 488.917 68.2505 488.917C68.4683 488.917 68.6719 488.888 68.8613 488.832C69.0531 488.772 69.2247 488.686 69.3762 488.572C69.5301 488.459 69.6592 488.319 69.7633 488.153C69.8699 487.988 69.9432 487.798 69.9835 487.585L71.3116 487.592C71.2619 487.938 71.1542 488.262 70.9885 488.565C70.8251 488.868 70.6109 489.136 70.3457 489.368C70.0806 489.598 69.7704 489.777 69.4153 489.908C69.0602 490.036 68.666 490.099 68.2328 490.099C67.5936 490.099 67.023 489.951 66.5211 489.656C66.0192 489.36 65.6239 488.932 65.335 488.374C65.0462 487.815 64.9018 487.145 64.9018 486.364C64.9018 485.58 65.0474 484.91 65.3386 484.354C65.6298 483.795 66.0263 483.368 66.5282 483.072C67.0301 482.776 67.5983 482.628 68.2328 482.628C68.6376 482.628 69.014 482.685 69.362 482.798C69.71 482.912 70.0202 483.079 70.2924 483.299C70.5647 483.517 70.7884 483.784 70.9636 484.102C71.1412 484.416 71.2572 484.776 71.3116 485.181ZM72.5181 490V482.727H75.2454C75.8041 482.727 76.2728 482.824 76.6516 483.018C77.0328 483.213 77.3204 483.485 77.5146 483.835C77.7111 484.183 77.8093 484.589 77.8093 485.053C77.8093 485.52 77.7099 485.924 77.511 486.268C77.3145 486.609 77.0245 486.873 76.641 487.06C76.2575 487.244 75.7863 487.337 75.2276 487.337H73.2852V486.243H75.0501C75.3768 486.243 75.6443 486.198 75.8526 486.108C76.061 486.016 76.2148 485.882 76.3143 485.707C76.4161 485.529 76.467 485.311 76.467 485.053C76.467 484.795 76.4161 484.575 76.3143 484.393C76.2125 484.208 76.0574 484.068 75.8491 483.974C75.6407 483.877 75.372 483.828 75.043 483.828H73.8356V490H72.5181ZM76.2752 486.705L78.0756 490H76.6055L74.837 486.705H76.2752ZM79.956 490H78.5497L81.1101 482.727H82.7365L85.3004 490H83.8942L81.9517 484.219H81.8949L79.956 490ZM80.0021 487.148H83.8374V488.207H80.0021V487.148ZM92.1417 485.181H90.8136C90.7757 484.963 90.7058 484.77 90.604 484.602C90.5022 484.432 90.3756 484.287 90.2241 484.169C90.0726 484.051 89.8997 483.962 89.7056 483.903C89.5138 483.841 89.3067 483.81 89.0842 483.81C88.6888 483.81 88.3384 483.91 88.033 484.109C87.7276 484.305 87.4885 484.594 87.3157 484.975C87.1429 485.354 87.0565 485.817 87.0565 486.364C87.0565 486.92 87.1429 487.389 87.3157 487.77C87.4909 488.149 87.73 488.435 88.033 488.629C88.3384 488.821 88.6876 488.917 89.0806 488.917C89.2984 488.917 89.502 488.888 89.6914 488.832C89.8832 488.772 90.0548 488.686 90.2063 488.572C90.3602 488.459 90.4892 488.319 90.5934 488.153C90.6999 487.988 90.7733 487.798 90.8136 487.585L92.1417 487.592C92.092 487.938 91.9843 488.262 91.8185 488.565C91.6552 488.868 91.4409 489.136 91.1758 489.368C90.9106 489.598 90.6005 489.777 90.2454 489.908C89.8903 490.036 89.4961 490.099 89.0629 490.099C88.4237 490.099 87.8531 489.951 87.3512 489.656C86.8493 489.36 86.454 488.932 86.1651 488.374C85.8763 487.815 85.7319 487.145 85.7319 486.364C85.7319 485.58 85.8775 484.91 86.1687 484.354C86.4599 483.795 86.8564 483.368 87.3583 483.072C87.8602 482.776 88.4284 482.628 89.0629 482.628C89.4677 482.628 89.8441 482.685 90.1921 482.798C90.5401 482.912 90.8503 483.079 91.1225 483.299C91.3948 483.517 91.6185 483.784 91.7937 484.102C91.9712 484.416 92.0872 484.776 92.1417 485.181Z"
        fill={colorConfig.text}
      />
      <mask id="path-98-inside-44_1077_273" fill="white">
        <path d="M127 466H211V507H127V466Z" />
      </mask>
      {/* CRAC-6 */}
      <g mask="url(#semicircle-mask-6)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={127}
          startY={450}
        />
      </g>
      <path d="M127 466H211V507H127V466Z" fill={colorConfig.block_fill} />
      <path
        d="M127 466V465H126V466H127ZM211 466H212V465H211V466ZM127 466V467H211V466V465H127V466ZM211 466H210V507H211H212V466H211ZM127 507H128V466H127H126V507H127Z"
        fill={colorConfig.block_stroke}
        mask="url(#path-98-inside-44_1077_273)"
      />
      <path
        d="M161.312 485.181H159.983C159.946 484.963 159.876 484.77 159.774 484.602C159.672 484.432 159.546 484.287 159.394 484.169C159.242 484.051 159.07 483.962 158.876 483.903C158.684 483.841 158.477 483.81 158.254 483.81C157.859 483.81 157.508 483.91 157.203 484.109C156.898 484.305 156.658 484.594 156.486 484.975C156.313 485.354 156.226 485.817 156.226 486.364C156.226 486.92 156.313 487.389 156.486 487.77C156.661 488.149 156.9 488.435 157.203 488.629C157.508 488.821 157.858 488.917 158.251 488.917C158.468 488.917 158.672 488.888 158.861 488.832C159.053 488.772 159.225 488.686 159.376 488.572C159.53 488.459 159.659 488.319 159.763 488.153C159.87 487.988 159.943 487.798 159.983 487.585L161.312 487.592C161.262 487.938 161.154 488.262 160.988 488.565C160.825 488.868 160.611 489.136 160.346 489.368C160.081 489.598 159.77 489.777 159.415 489.908C159.06 490.036 158.666 490.099 158.233 490.099C157.594 490.099 157.023 489.951 156.521 489.656C156.019 489.36 155.624 488.932 155.335 488.374C155.046 487.815 154.902 487.145 154.902 486.364C154.902 485.58 155.047 484.91 155.339 484.354C155.63 483.795 156.026 483.368 156.528 483.072C157.03 482.776 157.598 482.628 158.233 482.628C158.638 482.628 159.014 482.685 159.362 482.798C159.71 482.912 160.02 483.079 160.292 483.299C160.565 483.517 160.788 483.784 160.964 484.102C161.141 484.416 161.257 484.776 161.312 485.181ZM162.518 490V482.727H165.245C165.804 482.727 166.273 482.824 166.652 483.018C167.033 483.213 167.32 483.485 167.515 483.835C167.711 484.183 167.809 484.589 167.809 485.053C167.809 485.52 167.71 485.924 167.511 486.268C167.315 486.609 167.025 486.873 166.641 487.06C166.257 487.244 165.786 487.337 165.228 487.337H163.285V486.243H165.05C165.377 486.243 165.644 486.198 165.853 486.108C166.061 486.016 166.215 485.882 166.314 485.707C166.416 485.529 166.467 485.311 166.467 485.053C166.467 484.795 166.416 484.575 166.314 484.393C166.212 484.208 166.057 484.068 165.849 483.974C165.641 483.877 165.372 483.828 165.043 483.828H163.836V490H162.518ZM166.275 486.705L168.076 490H166.605L164.837 486.705H166.275ZM169.956 490H168.55L171.11 482.727H172.737L175.3 490H173.894L171.952 484.219H171.895L169.956 490ZM170.002 487.148H173.837V488.207H170.002V487.148ZM182.142 485.181H180.814C180.776 484.963 180.706 484.77 180.604 484.602C180.502 484.432 180.376 484.287 180.224 484.169C180.073 484.051 179.9 483.962 179.706 483.903C179.514 483.841 179.307 483.81 179.084 483.81C178.689 483.81 178.338 483.91 178.033 484.109C177.728 484.305 177.489 484.594 177.316 484.975C177.143 485.354 177.056 485.817 177.056 486.364C177.056 486.92 177.143 487.389 177.316 487.77C177.491 488.149 177.73 488.435 178.033 488.629C178.338 488.821 178.688 488.917 179.081 488.917C179.298 488.917 179.502 488.888 179.691 488.832C179.883 488.772 180.055 488.686 180.206 488.572C180.36 488.459 180.489 488.319 180.593 488.153C180.7 487.988 180.773 487.798 180.814 487.585L182.142 487.592C182.092 487.938 181.984 488.262 181.819 488.565C181.655 488.868 181.441 489.136 181.176 489.368C180.911 489.598 180.6 489.777 180.245 489.908C179.89 490.036 179.496 490.099 179.063 490.099C178.424 490.099 177.853 489.951 177.351 489.656C176.849 489.36 176.454 488.932 176.165 488.374C175.876 487.815 175.732 487.145 175.732 486.364C175.732 485.58 175.877 484.91 176.169 484.354C176.46 483.795 176.856 483.368 177.358 483.072C177.86 482.776 178.428 482.628 179.063 482.628C179.468 482.628 179.844 482.685 180.192 482.798C180.54 482.912 180.85 483.079 181.123 483.299C181.395 483.517 181.618 483.784 181.794 484.102C181.971 484.416 182.087 484.776 182.142 485.181Z"
        fill={colorConfig.text}
      />
      <mask id="path-101-inside-45_1077_273" fill="white">
        <path d="M321 466H405V507H321V466Z" />
      </mask>
      {/* CRAC-7 */}
      <g mask="url(#semicircle-mask-7)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={321}
          startY={450}
        />
      </g>
      <path d="M321 466H405V507H321V466Z" fill={colorConfig.block_fill} />
      <path
        d="M321 466V465H320V466H321ZM405 466H406V465H405V466ZM321 466V467H405V466V465H321V466ZM405 466H404V507H405H406V466H405ZM321 507H322V466H321H320V507H321Z"
        fill={colorConfig.block_stroke}
        mask="url(#path-101-inside-45_1077_273)"
      />
      <path
        d="M355.312 485.181H353.983C353.946 484.963 353.876 484.77 353.774 484.602C353.672 484.432 353.546 484.287 353.394 484.169C353.242 484.051 353.07 483.962 352.876 483.903C352.684 483.841 352.477 483.81 352.254 483.81C351.859 483.81 351.508 483.91 351.203 484.109C350.898 484.305 350.658 484.594 350.486 484.975C350.313 485.354 350.226 485.817 350.226 486.364C350.226 486.92 350.313 487.389 350.486 487.77C350.661 488.149 350.9 488.435 351.203 488.629C351.508 488.821 351.858 488.917 352.251 488.917C352.468 488.917 352.672 488.888 352.861 488.832C353.053 488.772 353.225 488.686 353.376 488.572C353.53 488.459 353.659 488.319 353.763 488.153C353.87 487.988 353.943 487.798 353.983 487.585L355.312 487.592C355.262 487.938 355.154 488.262 354.988 488.565C354.825 488.868 354.611 489.136 354.346 489.368C354.081 489.598 353.77 489.777 353.415 489.908C353.06 490.036 352.666 490.099 352.233 490.099C351.594 490.099 351.023 489.951 350.521 489.656C350.019 489.36 349.624 488.932 349.335 488.374C349.046 487.815 348.902 487.145 348.902 486.364C348.902 485.58 349.047 484.91 349.339 484.354C349.63 483.795 350.026 483.368 350.528 483.072C351.03 482.776 351.598 482.628 352.233 482.628C352.638 482.628 353.014 482.685 353.362 482.798C353.71 482.912 354.02 483.079 354.292 483.299C354.565 483.517 354.788 483.784 354.964 484.102C355.141 484.416 355.257 484.776 355.312 485.181ZM356.518 490V482.727H359.245C359.804 482.727 360.273 482.824 360.652 483.018C361.033 483.213 361.32 483.485 361.515 483.835C361.711 484.183 361.809 484.589 361.809 485.053C361.809 485.52 361.71 485.924 361.511 486.268C361.315 486.609 361.025 486.873 360.641 487.06C360.257 487.244 359.786 487.337 359.228 487.337H357.285V486.243H359.05C359.377 486.243 359.644 486.198 359.853 486.108C360.061 486.016 360.215 485.882 360.314 485.707C360.416 485.529 360.467 485.311 360.467 485.053C360.467 484.795 360.416 484.575 360.314 484.393C360.212 484.208 360.057 484.068 359.849 483.974C359.641 483.877 359.372 483.828 359.043 483.828H357.836V490H356.518ZM360.275 486.705L362.076 490H360.605L358.837 486.705H360.275ZM363.956 490H362.55L365.11 482.727H366.737L369.3 490H367.894L365.952 484.219H365.895L363.956 490ZM364.002 487.148H367.837V488.207H364.002V487.148ZM376.142 485.181H374.814C374.776 484.963 374.706 484.77 374.604 484.602C374.502 484.432 374.376 484.287 374.224 484.169C374.073 484.051 373.9 483.962 373.706 483.903C373.514 483.841 373.307 483.81 373.084 483.81C372.689 483.81 372.338 483.91 372.033 484.109C371.728 484.305 371.489 484.594 371.316 484.975C371.143 485.354 371.056 485.817 371.056 486.364C371.056 486.92 371.143 487.389 371.316 487.77C371.491 488.149 371.73 488.435 372.033 488.629C372.338 488.821 372.688 488.917 373.081 488.917C373.298 488.917 373.502 488.888 373.691 488.832C373.883 488.772 374.055 488.686 374.206 488.572C374.36 488.459 374.489 488.319 374.593 488.153C374.7 487.988 374.773 487.798 374.814 487.585L376.142 487.592C376.092 487.938 375.984 488.262 375.819 488.565C375.655 488.868 375.441 489.136 375.176 489.368C374.911 489.598 374.6 489.777 374.245 489.908C373.89 490.036 373.496 490.099 373.063 490.099C372.424 490.099 371.853 489.951 371.351 489.656C370.849 489.36 370.454 488.932 370.165 488.374C369.876 487.815 369.732 487.145 369.732 486.364C369.732 485.58 369.877 484.91 370.169 484.354C370.46 483.795 370.856 483.368 371.358 483.072C371.86 482.776 372.428 482.628 373.063 482.628C373.468 482.628 373.844 482.685 374.192 482.798C374.54 482.912 374.85 483.079 375.123 483.299C375.395 483.517 375.618 483.784 375.794 484.102C375.971 484.416 376.087 484.776 376.142 485.181Z"
        fill={colorConfig.text}
      />
      <mask id="path-104-inside-46_1077_273" fill="white">
        <path d="M412 466H496V507H412V466Z" />
      </mask>
      {/* CRAC-8 */}
      <g mask="url(#semicircle-mask-8)">
        <AnimatedCircles
          color={colorConfig.particles}
          startX={412}
          startY={450}
        />
      </g>
      <path d="M412 466H496V507H412V466Z" fill={colorConfig.block_fill} />
      <path
        d="M412 466V465H411V466H412ZM496 466H497V465H496V466ZM412 466V467H496V466V465H412V466ZM496 466H495V507H496H497V466H496ZM412 507H413V466H412H411V507H412Z"
        fill={colorConfig.block_stroke}
        mask="url(#path-104-inside-46_1077_273)"
      />
      <path
        d="M446.312 485.181H444.983C444.946 484.963 444.876 484.77 444.774 484.602C444.672 484.432 444.546 484.287 444.394 484.169C444.242 484.051 444.07 483.962 443.876 483.903C443.684 483.841 443.477 483.81 443.254 483.81C442.859 483.81 442.508 483.91 442.203 484.109C441.898 484.305 441.658 484.594 441.486 484.975C441.313 485.354 441.226 485.817 441.226 486.364C441.226 486.92 441.313 487.389 441.486 487.77C441.661 488.149 441.9 488.435 442.203 488.629C442.508 488.821 442.858 488.917 443.251 488.917C443.468 488.917 443.672 488.888 443.861 488.832C444.053 488.772 444.225 488.686 444.376 488.572C444.53 488.459 444.659 488.319 444.763 488.153C444.87 487.988 444.943 487.798 444.983 487.585L446.312 487.592C446.262 487.938 446.154 488.262 445.988 488.565C445.825 488.868 445.611 489.136 445.346 489.368C445.081 489.598 444.77 489.777 444.415 489.908C444.06 490.036 443.666 490.099 443.233 490.099C442.594 490.099 442.023 489.951 441.521 489.656C441.019 489.36 440.624 488.932 440.335 488.374C440.046 487.815 439.902 487.145 439.902 486.364C439.902 485.58 440.047 484.91 440.339 484.354C440.63 483.795 441.026 483.368 441.528 483.072C442.03 482.776 442.598 482.628 443.233 482.628C443.638 482.628 444.014 482.685 444.362 482.798C444.71 482.912 445.02 483.079 445.292 483.299C445.565 483.517 445.788 483.784 445.964 484.102C446.141 484.416 446.257 484.776 446.312 485.181ZM447.518 490V482.727H450.245C450.804 482.727 451.273 482.824 451.652 483.018C452.033 483.213 452.32 483.485 452.515 483.835C452.711 484.183 452.809 484.589 452.809 485.053C452.809 485.52 452.71 485.924 452.511 486.268C452.315 486.609 452.025 486.873 451.641 487.06C451.257 487.244 450.786 487.337 450.228 487.337H448.285V486.243H450.05C450.377 486.243 450.644 486.198 450.853 486.108C451.061 486.016 451.215 485.882 451.314 485.707C451.416 485.529 451.467 485.311 451.467 485.053C451.467 484.795 451.416 484.575 451.314 484.393C451.212 484.208 451.057 484.068 450.849 483.974C450.641 483.877 450.372 483.828 450.043 483.828H448.836V490H447.518ZM451.275 486.705L453.076 490H451.605L449.837 486.705H451.275ZM454.956 490H453.55L456.11 482.727H457.737L460.3 490H458.894L456.952 484.219H456.895L454.956 490ZM455.002 487.148H458.837V488.207H455.002V487.148ZM467.142 485.181H465.814C465.776 484.963 465.706 484.77 465.604 484.602C465.502 484.432 465.376 484.287 465.224 484.169C465.073 484.051 464.9 483.962 464.706 483.903C464.514 483.841 464.307 483.81 464.084 483.81C463.689 483.81 463.338 483.91 463.033 484.109C462.728 484.305 462.489 484.594 462.316 484.975C462.143 485.354 462.056 485.817 462.056 486.364C462.056 486.92 462.143 487.389 462.316 487.77C462.491 488.149 462.73 488.435 463.033 488.629C463.338 488.821 463.688 488.917 464.081 488.917C464.298 488.917 464.502 488.888 464.691 488.832C464.883 488.772 465.055 488.686 465.206 488.572C465.36 488.459 465.489 488.319 465.593 488.153C465.7 487.988 465.773 487.798 465.814 487.585L467.142 487.592C467.092 487.938 466.984 488.262 466.819 488.565C466.655 488.868 466.441 489.136 466.176 489.368C465.911 489.598 465.6 489.777 465.245 489.908C464.89 490.036 464.496 490.099 464.063 490.099C463.424 490.099 462.853 489.951 462.351 489.656C461.849 489.36 461.454 488.932 461.165 488.374C460.876 487.815 460.732 487.145 460.732 486.364C460.732 485.58 460.877 484.91 461.169 484.354C461.46 483.795 461.856 483.368 462.358 483.072C462.86 482.776 463.428 482.628 464.063 482.628C464.468 482.628 464.844 482.685 465.192 482.798C465.54 482.912 465.85 483.079 466.123 483.299C466.395 483.517 466.618 483.784 466.794 484.102C466.971 484.416 467.087 484.776 467.142 485.181Z"
        fill={colorConfig.text}
      />
      <mask id="path-107-inside-47_1077_273" fill="white">
        <path d="M63 91H91V413H63V91Z" />
      </mask>
      <path d="M63 91H91V413H63V91Z" fill={colorConfig.block_fill} />
      <path
        d="M63 91V90H62V91H63ZM63 413H62V414H63V413ZM63 91V92H91V91V90H63V91ZM91 413V412H63V413V414H91V413ZM63 413H64V91H63H62V413H63Z"
        fill={colorConfig.block_stroke}
        mask="url(#path-107-inside-47_1077_273)"
      />
      <path
        d="M68.2237 406.289V410.82C68.2237 410.92 68.3026 411 68.3999 411C68.4972 411 68.5761 410.92 68.5761 410.82V406.289C68.5761 406.19 68.4972 406.11 68.3999 406.11C68.3026 406.11 68.2237 406.19 68.2237 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 408.375C66.0789 408.375 66 408.456 66 408.555C66 408.654 66.0789 408.734 66.1762 408.734H70.6238C70.7212 408.734 70.8 408.654 70.8 408.555C70.8 408.456 70.7212 408.375 70.6238 408.375H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 396.508V401.04C68.2237 401.139 68.3026 401.219 68.3999 401.219C68.4972 401.219 68.5761 401.139 68.5761 401.04V396.508C68.5761 396.409 68.4972 396.329 68.3999 396.329C68.3026 396.329 68.2237 396.409 68.2237 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 398.595C66.0789 398.595 66 398.675 66 398.774C66 398.873 66.0789 398.954 66.1762 398.954H70.6238C70.7212 398.954 70.8 398.873 70.8 398.774C70.8 398.675 70.7212 398.595 70.6238 398.595H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 386.728V391.259C68.2237 391.358 68.3026 391.439 68.3999 391.439C68.4972 391.439 68.5761 391.358 68.5761 391.259V386.728C68.5761 386.629 68.4972 386.548 68.3999 386.548C68.3026 386.548 68.2237 386.629 68.2237 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 388.814C66.0789 388.814 66 388.894 66 388.994C66 389.093 66.0789 389.173 66.1762 389.173H70.6238C70.7212 389.173 70.8 389.093 70.8 388.994C70.8 388.894 70.7212 388.814 70.6238 388.814H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 376.947V381.479C68.2237 381.578 68.3026 381.658 68.3999 381.658C68.4972 381.658 68.5761 381.578 68.5761 381.479V376.947C68.5761 376.848 68.4972 376.768 68.3999 376.768C68.3026 376.768 68.2237 376.848 68.2237 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 379.033C66.0789 379.033 66 379.114 66 379.213C66 379.312 66.0789 379.392 66.1762 379.392H70.6238C70.7212 379.392 70.8 379.312 70.8 379.213C70.8 379.114 70.7212 379.033 70.6238 379.033H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 367.167V371.698C68.2237 371.797 68.3026 371.877 68.3999 371.877C68.4972 371.877 68.5761 371.797 68.5761 371.698V367.167C68.5761 367.067 68.4972 366.987 68.3999 366.987C68.3026 366.987 68.2237 367.067 68.2237 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 369.253C66.0789 369.253 66 369.333 66 369.432C66 369.531 66.0789 369.612 66.1762 369.612H70.6238C70.7212 369.612 70.8 369.531 70.8 369.432C70.8 369.333 70.7212 369.253 70.6238 369.253H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 357.386V361.917C68.2237 362.016 68.3026 362.097 68.3999 362.097C68.4972 362.097 68.5761 362.016 68.5761 361.917V357.386C68.5761 357.287 68.4972 357.206 68.3999 357.206C68.3026 357.206 68.2237 357.287 68.2237 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 359.472C66.0789 359.472 66 359.552 66 359.652C66 359.751 66.0789 359.831 66.1762 359.831H70.6238C70.7212 359.831 70.8 359.751 70.8 359.652C70.8 359.552 70.7212 359.472 70.6238 359.472H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 347.605V352.137C68.2237 352.236 68.3026 352.316 68.3999 352.316C68.4972 352.316 68.5761 352.236 68.5761 352.137V347.605C68.5761 347.506 68.4972 347.426 68.3999 347.426C68.3026 347.426 68.2237 347.506 68.2237 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 349.691C66.0789 349.691 66 349.772 66 349.871C66 349.97 66.0789 350.05 66.1762 350.05H70.6238C70.7212 350.05 70.8 349.97 70.8 349.871C70.8 349.772 70.7212 349.691 70.6238 349.691H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 337.825V342.356C68.2237 342.455 68.3026 342.535 68.3999 342.535C68.4972 342.535 68.5761 342.455 68.5761 342.356V337.825C68.5761 337.725 68.4972 337.645 68.3999 337.645C68.3026 337.645 68.2237 337.725 68.2237 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 339.911C66.0789 339.911 66 339.991 66 340.09C66 340.189 66.0789 340.27 66.1762 340.27H70.6238C70.7212 340.27 70.8 340.189 70.8 340.09C70.8 339.991 70.7212 339.911 70.6238 339.911H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 328.044V332.575C68.2237 332.674 68.3026 332.755 68.3999 332.755C68.4972 332.755 68.5761 332.674 68.5761 332.575V328.044C68.5761 327.945 68.4972 327.864 68.3999 327.864C68.3026 327.864 68.2237 327.945 68.2237 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 330.13C66.0789 330.13 66 330.21 66 330.31C66 330.409 66.0789 330.489 66.1762 330.489H70.6238C70.7212 330.489 70.8 330.409 70.8 330.31C70.8 330.21 70.7212 330.13 70.6238 330.13H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 318.263V322.795C68.2237 322.894 68.3026 322.974 68.3999 322.974C68.4972 322.974 68.5761 322.894 68.5761 322.795V318.263C68.5761 318.164 68.4972 318.084 68.3999 318.084C68.3026 318.084 68.2237 318.164 68.2237 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 320.349C66.0789 320.349 66 320.43 66 320.529C66 320.628 66.0789 320.708 66.1762 320.708H70.6238C70.7212 320.708 70.8 320.628 70.8 320.529C70.8 320.43 70.7212 320.349 70.6238 320.349H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 308.483V313.014C68.2237 313.113 68.3026 313.193 68.3999 313.193C68.4972 313.193 68.5761 313.113 68.5761 313.014V308.483C68.5761 308.383 68.4972 308.303 68.3999 308.303C68.3026 308.303 68.2237 308.383 68.2237 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 310.569C66.0789 310.569 66 310.649 66 310.748C66 310.847 66.0789 310.928 66.1762 310.928H70.6238C70.7212 310.928 70.8 310.847 70.8 310.748C70.8 310.649 70.7212 310.569 70.6238 310.569H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 298.702V303.233C68.2237 303.332 68.3026 303.413 68.3999 303.413C68.4972 303.413 68.5761 303.332 68.5761 303.233V298.702C68.5761 298.603 68.4972 298.522 68.3999 298.522C68.3026 298.522 68.2237 298.603 68.2237 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 300.788C66.0789 300.788 66 300.869 66 300.968C66 301.067 66.0789 301.147 66.1762 301.147H70.6238C70.7212 301.147 70.8 301.067 70.8 300.968C70.8 300.869 70.7212 300.788 70.6238 300.788H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 288.921L68.2237 293.453C68.2237 293.552 68.3026 293.632 68.3999 293.632C68.4972 293.632 68.5761 293.552 68.5761 293.453L68.5761 288.921C68.5761 288.822 68.4972 288.742 68.3999 288.742C68.3026 288.742 68.2237 288.822 68.2237 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 291.008C66.0789 291.008 66 291.088 66 291.187C66 291.286 66.0789 291.367 66.1762 291.367H70.6238C70.7212 291.367 70.8 291.286 70.8 291.187C70.8 291.088 70.7212 291.008 70.6238 291.008H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 279.14V283.672C68.2237 283.771 68.3026 283.851 68.3999 283.851C68.4972 283.851 68.5761 283.771 68.5761 283.672V279.14C68.5761 279.041 68.4972 278.961 68.3999 278.961C68.3026 278.961 68.2237 279.041 68.2237 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 281.227C66.0789 281.227 66 281.307 66 281.406C66 281.505 66.0789 281.586 66.1762 281.586H70.6238C70.7212 281.586 70.8 281.505 70.8 281.406C70.8 281.307 70.7212 281.227 70.6238 281.227H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 269.36V273.891C68.2237 273.99 68.3026 274.071 68.3999 274.071C68.4972 274.071 68.5761 273.99 68.5761 273.891V269.36C68.5761 269.261 68.4972 269.18 68.3999 269.18C68.3026 269.18 68.2237 269.261 68.2237 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 271.446C66.0789 271.446 66 271.526 66 271.626C66 271.725 66.0789 271.805 66.1762 271.805H70.6238C70.7212 271.805 70.8 271.725 70.8 271.626C70.8 271.526 70.7212 271.446 70.6238 271.446H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 259.579V264.111C68.2237 264.21 68.3026 264.29 68.3999 264.29C68.4972 264.29 68.5761 264.21 68.5761 264.111V259.579C68.5761 259.48 68.4972 259.4 68.3999 259.4C68.3026 259.4 68.2237 259.48 68.2237 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 261.666C66.0789 261.666 66 261.746 66 261.845C66 261.944 66.0789 262.025 66.1762 262.025H70.6238C70.7212 262.025 70.8 261.944 70.8 261.845C70.8 261.746 70.7212 261.666 70.6238 261.666H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 406.289V410.82C77.8238 410.92 77.9027 411 78 411C78.0973 411 78.1762 410.92 78.1762 410.82V406.289C78.1762 406.19 78.0973 406.11 78 406.11C77.9027 406.11 77.8238 406.19 77.8238 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 408.375C75.6788 408.375 75.5999 408.456 75.5999 408.555C75.5999 408.654 75.6788 408.734 75.7761 408.734H80.2237C80.321 408.734 80.3999 408.654 80.3999 408.555C80.3999 408.456 80.321 408.375 80.2237 408.375H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 396.508V401.04C77.8238 401.139 77.9027 401.219 78 401.219C78.0973 401.219 78.1762 401.139 78.1762 401.04V396.508C78.1762 396.409 78.0973 396.329 78 396.329C77.9027 396.329 77.8238 396.409 77.8238 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 398.595C75.6788 398.595 75.5999 398.675 75.5999 398.774C75.5999 398.873 75.6788 398.954 75.7761 398.954H80.2237C80.321 398.954 80.3999 398.873 80.3999 398.774C80.3999 398.675 80.321 398.595 80.2237 398.595H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 386.728V391.259C77.8238 391.358 77.9027 391.439 78 391.439C78.0973 391.439 78.1762 391.358 78.1762 391.259V386.728C78.1762 386.629 78.0973 386.548 78 386.548C77.9027 386.548 77.8238 386.629 77.8238 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 388.814C75.6788 388.814 75.5999 388.894 75.5999 388.994C75.5999 389.093 75.6788 389.173 75.7761 389.173H80.2237C80.321 389.173 80.3999 389.093 80.3999 388.994C80.3999 388.894 80.321 388.814 80.2237 388.814H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 376.947V381.479C77.8238 381.578 77.9027 381.658 78 381.658C78.0973 381.658 78.1762 381.578 78.1762 381.479V376.947C78.1762 376.848 78.0973 376.768 78 376.768C77.9027 376.768 77.8238 376.848 77.8238 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 379.033C75.6788 379.033 75.5999 379.114 75.5999 379.213C75.5999 379.312 75.6788 379.392 75.7761 379.392H80.2237C80.321 379.392 80.3999 379.312 80.3999 379.213C80.3999 379.114 80.321 379.033 80.2237 379.033H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 367.167V371.698C77.8238 371.797 77.9027 371.877 78 371.877C78.0973 371.877 78.1762 371.797 78.1762 371.698V367.167C78.1762 367.067 78.0973 366.987 78 366.987C77.9027 366.987 77.8238 367.067 77.8238 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 369.253C75.6788 369.253 75.5999 369.333 75.5999 369.432C75.5999 369.531 75.6788 369.612 75.7761 369.612H80.2237C80.321 369.612 80.3999 369.531 80.3999 369.432C80.3999 369.333 80.321 369.253 80.2237 369.253H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 357.386V361.917C77.8238 362.016 77.9027 362.097 78 362.097C78.0973 362.097 78.1762 362.016 78.1762 361.917V357.386C78.1762 357.287 78.0973 357.206 78 357.206C77.9027 357.206 77.8238 357.287 77.8238 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 359.472C75.6788 359.472 75.5999 359.552 75.5999 359.652C75.5999 359.751 75.6788 359.831 75.7761 359.831H80.2237C80.321 359.831 80.3999 359.751 80.3999 359.652C80.3999 359.552 80.321 359.472 80.2237 359.472H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 347.605V352.137C77.8238 352.236 77.9027 352.316 78 352.316C78.0973 352.316 78.1762 352.236 78.1762 352.137V347.605C78.1762 347.506 78.0973 347.426 78 347.426C77.9027 347.426 77.8238 347.506 77.8238 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 349.691C75.6788 349.691 75.5999 349.772 75.5999 349.871C75.5999 349.97 75.6788 350.05 75.7761 350.05H80.2237C80.321 350.05 80.3999 349.97 80.3999 349.871C80.3999 349.772 80.321 349.691 80.2237 349.691H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 337.825V342.356C77.8238 342.455 77.9027 342.535 78 342.535C78.0973 342.535 78.1762 342.455 78.1762 342.356V337.825C78.1762 337.725 78.0973 337.645 78 337.645C77.9027 337.645 77.8238 337.725 77.8238 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 339.911C75.6788 339.911 75.5999 339.991 75.5999 340.09C75.5999 340.189 75.6788 340.27 75.7761 340.27H80.2237C80.321 340.27 80.3999 340.189 80.3999 340.09C80.3999 339.991 80.321 339.911 80.2237 339.911H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 328.044V332.575C77.8238 332.674 77.9027 332.755 78 332.755C78.0973 332.755 78.1762 332.674 78.1762 332.575V328.044C78.1762 327.945 78.0973 327.864 78 327.864C77.9027 327.864 77.8238 327.945 77.8238 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 330.13C75.6788 330.13 75.5999 330.21 75.5999 330.31C75.5999 330.409 75.6788 330.489 75.7761 330.489H80.2237C80.321 330.489 80.3999 330.409 80.3999 330.31C80.3999 330.21 80.321 330.13 80.2237 330.13H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 318.263V322.795C77.8238 322.894 77.9027 322.974 78 322.974C78.0973 322.974 78.1762 322.894 78.1762 322.795V318.263C78.1762 318.164 78.0973 318.084 78 318.084C77.9027 318.084 77.8238 318.164 77.8238 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 320.349C75.6788 320.349 75.5999 320.43 75.5999 320.529C75.5999 320.628 75.6788 320.708 75.7761 320.708H80.2237C80.321 320.708 80.3999 320.628 80.3999 320.529C80.3999 320.43 80.321 320.349 80.2237 320.349H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 308.483V313.014C77.8238 313.113 77.9027 313.193 78 313.193C78.0973 313.193 78.1762 313.113 78.1762 313.014V308.483C78.1762 308.383 78.0973 308.303 78 308.303C77.9027 308.303 77.8238 308.383 77.8238 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 310.569C75.6788 310.569 75.5999 310.649 75.5999 310.748C75.5999 310.847 75.6788 310.928 75.7761 310.928H80.2237C80.321 310.928 80.3999 310.847 80.3999 310.748C80.3999 310.649 80.321 310.569 80.2237 310.569H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 298.702V303.233C77.8238 303.332 77.9027 303.413 78 303.413C78.0973 303.413 78.1762 303.332 78.1762 303.233V298.702C78.1762 298.603 78.0973 298.522 78 298.522C77.9027 298.522 77.8238 298.603 77.8238 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 300.788C75.6788 300.788 75.5999 300.869 75.5999 300.968C75.5999 301.067 75.6788 301.147 75.7761 301.147H80.2237C80.321 301.147 80.3999 301.067 80.3999 300.968C80.3999 300.869 80.321 300.788 80.2237 300.788H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 288.921V293.453C77.8238 293.552 77.9027 293.632 78 293.632C78.0973 293.632 78.1762 293.552 78.1762 293.453V288.921C78.1762 288.822 78.0973 288.742 78 288.742C77.9027 288.742 77.8238 288.822 77.8238 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 291.008C75.6788 291.008 75.5999 291.088 75.5999 291.187C75.5999 291.286 75.6788 291.367 75.7761 291.367H80.2237C80.321 291.367 80.3999 291.286 80.3999 291.187C80.3999 291.088 80.321 291.008 80.2237 291.008H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 279.14L77.8238 283.672C77.8238 283.771 77.9027 283.851 78 283.851C78.0973 283.851 78.1762 283.771 78.1762 283.672L78.1762 279.14C78.1762 279.041 78.0973 278.961 78 278.961C77.9027 278.961 77.8238 279.041 77.8238 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 281.227C75.6788 281.227 75.5999 281.307 75.5999 281.406C75.5999 281.505 75.6788 281.586 75.7761 281.586H80.2237C80.321 281.586 80.3999 281.505 80.3999 281.406C80.3999 281.307 80.321 281.227 80.2237 281.227H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 269.36V273.891C77.8238 273.99 77.9027 274.071 78 274.071C78.0973 274.071 78.1762 273.99 78.1762 273.891V269.36C78.1762 269.261 78.0973 269.18 78 269.18C77.9027 269.18 77.8238 269.261 77.8238 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 271.446C75.6788 271.446 75.5999 271.526 75.5999 271.626C75.5999 271.725 75.6788 271.805 75.7761 271.805H80.2237C80.321 271.805 80.3999 271.725 80.3999 271.626C80.3999 271.526 80.321 271.446 80.2237 271.446H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 259.579V264.111C77.8238 264.21 77.9027 264.29 78 264.29C78.0973 264.29 78.1762 264.21 78.1762 264.111V259.579C78.1762 259.48 78.0973 259.4 78 259.4C77.9027 259.4 77.8238 259.48 77.8238 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 261.666C75.6788 261.666 75.5999 261.746 75.5999 261.845C75.5999 261.944 75.6788 262.025 75.7761 262.025H80.2237C80.321 262.025 80.3999 261.944 80.3999 261.845C80.3999 261.746 80.321 261.666 80.2237 261.666H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 406.289V410.82C87.4237 410.92 87.5026 411 87.5999 411C87.6972 411 87.7761 410.92 87.7761 410.82V406.289C87.7761 406.19 87.6972 406.11 87.5999 406.11C87.5026 406.11 87.4237 406.19 87.4237 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 408.375C85.2789 408.375 85.2 408.456 85.2 408.555C85.2 408.654 85.2789 408.734 85.3762 408.734H89.8238C89.9211 408.734 90 408.654 90 408.555C90 408.456 89.9211 408.375 89.8238 408.375H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 396.508V401.04C87.4237 401.139 87.5026 401.219 87.5999 401.219C87.6972 401.219 87.7761 401.139 87.7761 401.04V396.508C87.7761 396.409 87.6972 396.329 87.5999 396.329C87.5026 396.329 87.4237 396.409 87.4237 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 398.595C85.2789 398.595 85.2 398.675 85.2 398.774C85.2 398.873 85.2789 398.954 85.3762 398.954H89.8238C89.9211 398.954 90 398.873 90 398.774C90 398.675 89.9211 398.595 89.8238 398.595H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 386.728V391.259C87.4237 391.358 87.5026 391.439 87.5999 391.439C87.6972 391.439 87.7761 391.358 87.7761 391.259V386.728C87.7761 386.629 87.6972 386.548 87.5999 386.548C87.5026 386.548 87.4237 386.629 87.4237 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 388.814C85.2789 388.814 85.2 388.894 85.2 388.994C85.2 389.093 85.2789 389.173 85.3762 389.173H89.8238C89.9211 389.173 90 389.093 90 388.994C90 388.894 89.9211 388.814 89.8238 388.814H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 376.947V381.479C87.4237 381.578 87.5026 381.658 87.5999 381.658C87.6972 381.658 87.7761 381.578 87.7761 381.479V376.947C87.7761 376.848 87.6972 376.768 87.5999 376.768C87.5026 376.768 87.4237 376.848 87.4237 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 379.033C85.2789 379.033 85.2 379.114 85.2 379.213C85.2 379.312 85.2789 379.392 85.3762 379.392H89.8238C89.9211 379.392 90 379.312 90 379.213C90 379.114 89.9211 379.033 89.8238 379.033H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 367.167V371.698C87.4237 371.797 87.5026 371.877 87.5999 371.877C87.6972 371.877 87.7761 371.797 87.7761 371.698V367.167C87.7761 367.067 87.6972 366.987 87.5999 366.987C87.5026 366.987 87.4237 367.067 87.4237 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 369.253C85.2789 369.253 85.2 369.333 85.2 369.432C85.2 369.531 85.2789 369.612 85.3762 369.612H89.8238C89.9211 369.612 90 369.531 90 369.432C90 369.333 89.9211 369.253 89.8238 369.253H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 357.386V361.917C87.4237 362.016 87.5026 362.097 87.5999 362.097C87.6972 362.097 87.7761 362.016 87.7761 361.917V357.386C87.7761 357.287 87.6972 357.206 87.5999 357.206C87.5026 357.206 87.4237 357.287 87.4237 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 359.472C85.2789 359.472 85.2 359.552 85.2 359.652C85.2 359.751 85.2789 359.831 85.3762 359.831H89.8238C89.9211 359.831 90 359.751 90 359.652C90 359.552 89.9211 359.472 89.8238 359.472H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 347.605V352.137C87.4237 352.236 87.5026 352.316 87.5999 352.316C87.6972 352.316 87.7761 352.236 87.7761 352.137V347.605C87.7761 347.506 87.6972 347.426 87.5999 347.426C87.5026 347.426 87.4237 347.506 87.4237 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 349.691C85.2789 349.691 85.2 349.772 85.2 349.871C85.2 349.97 85.2789 350.05 85.3762 350.05H89.8238C89.9211 350.05 90 349.97 90 349.871C90 349.772 89.9211 349.691 89.8238 349.691H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 337.825V342.356C87.4237 342.455 87.5026 342.535 87.5999 342.535C87.6972 342.535 87.7761 342.455 87.7761 342.356V337.825C87.7761 337.725 87.6972 337.645 87.5999 337.645C87.5026 337.645 87.4237 337.725 87.4237 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 339.911C85.2789 339.911 85.2 339.991 85.2 340.09C85.2 340.189 85.2789 340.27 85.3762 340.27H89.8238C89.9211 340.27 90 340.189 90 340.09C90 339.991 89.9211 339.911 89.8238 339.911H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 328.044V332.575C87.4237 332.674 87.5026 332.755 87.5999 332.755C87.6972 332.755 87.7761 332.674 87.7761 332.575V328.044C87.7761 327.945 87.6972 327.864 87.5999 327.864C87.5026 327.864 87.4237 327.945 87.4237 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 330.13C85.2789 330.13 85.2 330.21 85.2 330.31C85.2 330.409 85.2789 330.489 85.3762 330.489H89.8238C89.9211 330.489 90 330.409 90 330.31C90 330.21 89.9211 330.13 89.8238 330.13H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 318.263V322.795C87.4237 322.894 87.5026 322.974 87.5999 322.974C87.6972 322.974 87.7761 322.894 87.7761 322.795V318.263C87.7761 318.164 87.6972 318.084 87.5999 318.084C87.5026 318.084 87.4237 318.164 87.4237 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 320.349C85.2789 320.349 85.2 320.43 85.2 320.529C85.2 320.628 85.2789 320.708 85.3762 320.708H89.8238C89.9211 320.708 90 320.628 90 320.529C90 320.43 89.9211 320.349 89.8238 320.349H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 308.483V313.014C87.4237 313.113 87.5026 313.193 87.5999 313.193C87.6972 313.193 87.7761 313.113 87.7761 313.014V308.483C87.7761 308.383 87.6972 308.303 87.5999 308.303C87.5026 308.303 87.4237 308.383 87.4237 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 310.569C85.2789 310.569 85.2 310.649 85.2 310.748C85.2 310.847 85.2789 310.928 85.3762 310.928H89.8238C89.9211 310.928 90 310.847 90 310.748C90 310.649 89.9211 310.569 89.8238 310.569H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 298.702V303.233C87.4237 303.332 87.5026 303.413 87.5999 303.413C87.6972 303.413 87.7761 303.332 87.7761 303.233V298.702C87.7761 298.603 87.6972 298.522 87.5999 298.522C87.5026 298.522 87.4237 298.603 87.4237 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 300.788C85.2789 300.788 85.2 300.869 85.2 300.968C85.2 301.067 85.2789 301.147 85.3762 301.147H89.8238C89.9211 301.147 90 301.067 90 300.968C90 300.869 89.9211 300.788 89.8238 300.788H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 288.921V293.453C87.4237 293.552 87.5026 293.632 87.5999 293.632C87.6972 293.632 87.7761 293.552 87.7761 293.453V288.921C87.7761 288.822 87.6972 288.742 87.5999 288.742C87.5026 288.742 87.4237 288.822 87.4237 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 291.008C85.2789 291.008 85.2 291.088 85.2 291.187C85.2 291.286 85.2789 291.367 85.3762 291.367H89.8238C89.9211 291.367 90 291.286 90 291.187C90 291.088 89.9211 291.008 89.8238 291.008H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 279.14V283.672C87.4237 283.771 87.5026 283.851 87.5999 283.851C87.6972 283.851 87.7761 283.771 87.7761 283.672V279.14C87.7761 279.041 87.6972 278.961 87.5999 278.961C87.5026 278.961 87.4237 279.041 87.4237 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 281.227C85.2789 281.227 85.2 281.307 85.2 281.406C85.2 281.505 85.2789 281.586 85.3762 281.586H89.8238C89.9211 281.586 90 281.505 90 281.406C90 281.307 89.9211 281.227 89.8238 281.227H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 269.36V273.891C87.4237 273.99 87.5026 274.071 87.5999 274.071C87.6972 274.071 87.7761 273.99 87.7761 273.891V269.36C87.7761 269.261 87.6972 269.18 87.5999 269.18C87.5026 269.18 87.4237 269.261 87.4237 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 271.446C85.2789 271.446 85.2 271.526 85.2 271.626C85.2 271.725 85.2789 271.805 85.3762 271.805H89.8238C89.9211 271.805 90 271.725 90 271.626C90 271.526 89.9211 271.446 89.8238 271.446H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 259.579V264.111C87.4237 264.21 87.5026 264.29 87.5999 264.29C87.6972 264.29 87.7761 264.21 87.7761 264.111V259.579C87.7761 259.48 87.6972 259.4 87.5999 259.4C87.5026 259.4 87.4237 259.48 87.4237 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 261.666C85.2789 261.666 85.2 261.746 85.2 261.845C85.2 261.944 85.2789 262.025 85.3762 262.025H89.8238C89.9211 262.025 90 261.944 90 261.845C90 261.746 89.9211 261.666 89.8238 261.666H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 259.579V264.111C68.2237 264.21 68.3026 264.29 68.3999 264.29C68.4972 264.29 68.5761 264.21 68.5761 264.111V259.579C68.5761 259.48 68.4972 259.4 68.3999 259.4C68.3026 259.4 68.2237 259.48 68.2237 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 261.666C66.0789 261.666 66 261.746 66 261.845C66 261.944 66.0789 262.025 66.1762 262.025H70.6238C70.7212 262.025 70.8 261.944 70.8 261.845C70.8 261.746 70.7212 261.666 70.6238 261.666H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 249.799V254.33C68.2237 254.429 68.3026 254.509 68.3999 254.509C68.4972 254.509 68.5761 254.429 68.5761 254.33V249.799C68.5761 249.699 68.4972 249.619 68.3999 249.619C68.3026 249.619 68.2237 249.699 68.2237 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 251.885C66.0789 251.885 66 251.965 66 252.064C66 252.163 66.0789 252.244 66.1762 252.244H70.6238C70.7211 252.244 70.8 252.163 70.8 252.064C70.8 251.965 70.7211 251.885 70.6238 251.885H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 240.018V244.549C68.2237 244.648 68.3026 244.729 68.3999 244.729C68.4972 244.729 68.5761 244.648 68.5761 244.549V240.018C68.5761 239.919 68.4972 239.838 68.3999 239.838C68.3026 239.838 68.2237 239.919 68.2237 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 242.104C66.0789 242.104 66 242.184 66 242.284C66 242.383 66.0789 242.463 66.1762 242.463H70.6238C70.7211 242.463 70.8 242.383 70.8 242.284C70.8 242.184 70.7211 242.104 70.6238 242.104H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 230.237V234.769C68.2237 234.868 68.3026 234.948 68.3999 234.948C68.4972 234.948 68.5761 234.868 68.5761 234.769V230.237C68.5761 230.138 68.4972 230.058 68.3999 230.058C68.3026 230.058 68.2237 230.138 68.2237 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 232.323C66.0789 232.323 66 232.404 66 232.503C66 232.602 66.0789 232.682 66.1762 232.682H70.6238C70.7211 232.682 70.8 232.602 70.8 232.503C70.8 232.404 70.7211 232.323 70.6238 232.323H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 220.457V224.988C68.2237 225.087 68.3026 225.167 68.3999 225.167C68.4972 225.167 68.5761 225.087 68.5761 224.988V220.457C68.5761 220.357 68.4972 220.277 68.3999 220.277C68.3026 220.277 68.2237 220.357 68.2237 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 222.543C66.0789 222.543 66 222.623 66 222.722C66 222.821 66.0789 222.902 66.1762 222.902H70.6238C70.7211 222.902 70.8 222.821 70.8 222.722C70.8 222.623 70.7211 222.543 70.6238 222.543H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 210.676V215.207C68.2237 215.306 68.3026 215.387 68.3999 215.387C68.4972 215.387 68.5761 215.306 68.5761 215.207V210.676C68.5761 210.577 68.4972 210.496 68.3999 210.496C68.3026 210.496 68.2237 210.577 68.2237 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 212.762C66.0789 212.762 66 212.842 66 212.942C66 213.041 66.0789 213.121 66.1762 213.121H70.6238C70.7211 213.121 70.8 213.041 70.8 212.942C70.8 212.842 70.7211 212.762 70.6238 212.762H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 200.895V205.427C68.2237 205.526 68.3026 205.606 68.3999 205.606C68.4972 205.606 68.5761 205.526 68.5761 205.427V200.895C68.5761 200.796 68.4972 200.716 68.3999 200.716C68.3026 200.716 68.2237 200.796 68.2237 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 202.981C66.0789 202.981 66 203.062 66 203.161C66 203.26 66.0789 203.34 66.1762 203.34H70.6238C70.7211 203.34 70.8 203.26 70.8 203.161C70.8 203.062 70.7211 202.981 70.6238 202.981H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 191.115V195.646C68.2237 195.745 68.3026 195.825 68.3999 195.825C68.4972 195.825 68.5761 195.745 68.5761 195.646V191.115C68.5761 191.016 68.4972 190.935 68.3999 190.935C68.3026 190.935 68.2237 191.016 68.2237 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 193.201C66.0789 193.201 66 193.281 66 193.38C66 193.479 66.0789 193.56 66.1762 193.56H70.6238C70.7211 193.56 70.8 193.479 70.8 193.38C70.8 193.281 70.7211 193.201 70.6238 193.201H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 181.334V185.865C68.2237 185.964 68.3026 186.045 68.3999 186.045C68.4972 186.045 68.5761 185.964 68.5761 185.865V181.334C68.5761 181.235 68.4972 181.154 68.3999 181.154C68.3026 181.154 68.2237 181.235 68.2237 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 183.42C66.0789 183.42 66 183.5 66 183.6C66 183.699 66.0789 183.779 66.1762 183.779H70.6238C70.7211 183.779 70.8 183.699 70.8 183.6C70.8 183.5 70.7211 183.42 70.6238 183.42H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 171.553V176.085C68.2237 176.184 68.3026 176.264 68.3999 176.264C68.4972 176.264 68.5761 176.184 68.5761 176.085V171.553C68.5761 171.454 68.4972 171.374 68.3999 171.374C68.3026 171.374 68.2237 171.454 68.2237 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 173.639C66.0789 173.639 66 173.72 66 173.819C66 173.918 66.0789 173.998 66.1762 173.998H70.6238C70.7211 173.998 70.8 173.918 70.8 173.819C70.8 173.72 70.7211 173.639 70.6238 173.639H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 161.773V166.304C68.2237 166.403 68.3026 166.483 68.3999 166.483C68.4972 166.483 68.5761 166.403 68.5761 166.304V161.773C68.5761 161.674 68.4972 161.593 68.3999 161.593C68.3026 161.593 68.2237 161.674 68.2237 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 163.859C66.0789 163.859 66 163.939 66 164.038C66 164.137 66.0789 164.218 66.1762 164.218H70.6238C70.7211 164.218 70.8 164.137 70.8 164.038C70.8 163.939 70.7211 163.859 70.6238 163.859H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 151.992V156.523C68.2237 156.622 68.3026 156.703 68.3999 156.703C68.4972 156.703 68.5761 156.622 68.5761 156.523V151.992C68.5761 151.893 68.4972 151.812 68.3999 151.812C68.3026 151.812 68.2237 151.893 68.2237 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 154.078C66.0789 154.078 66 154.158 66 154.258C66 154.357 66.0789 154.437 66.1762 154.437H70.6238C70.7211 154.437 70.8 154.357 70.8 154.258C70.8 154.158 70.7211 154.078 70.6238 154.078H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 142.211V146.743C68.2237 146.842 68.3026 146.922 68.3999 146.922C68.4972 146.922 68.5761 146.842 68.5761 146.743V142.211C68.5761 142.112 68.4972 142.032 68.3999 142.032C68.3026 142.032 68.2237 142.112 68.2237 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 144.297C66.0789 144.297 66 144.378 66 144.477C66 144.576 66.0789 144.657 66.1762 144.657H70.6238C70.7211 144.657 70.8 144.576 70.8 144.477C70.8 144.378 70.7211 144.297 70.6238 144.297H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 132.431V136.962C68.2237 137.061 68.3026 137.141 68.3999 137.141C68.4972 137.141 68.5761 137.061 68.5761 136.962V132.431C68.5761 132.331 68.4972 132.251 68.3999 132.251C68.3026 132.251 68.2237 132.331 68.2237 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 134.517C66.0789 134.517 66 134.597 66 134.696C66 134.795 66.0789 134.876 66.1762 134.876H70.6238C70.7211 134.876 70.8 134.795 70.8 134.696C70.8 134.597 70.7211 134.517 70.6238 134.517H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 122.65V127.181C68.2237 127.28 68.3026 127.361 68.3999 127.361C68.4972 127.361 68.5761 127.28 68.5761 127.181V122.65C68.5761 122.551 68.4972 122.47 68.3999 122.47C68.3026 122.47 68.2237 122.551 68.2237 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 124.736C66.0789 124.736 66 124.817 66 124.916C66 125.015 66.0789 125.095 66.1762 125.095H70.6238C70.7211 125.095 70.8 125.015 70.8 124.916C70.8 124.817 70.7211 124.736 70.6238 124.736H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 112.869V117.401C68.2237 117.5 68.3026 117.58 68.3999 117.58C68.4972 117.58 68.5761 117.5 68.5761 117.401V112.869C68.5761 112.77 68.4972 112.69 68.3999 112.69C68.3026 112.69 68.2237 112.77 68.2237 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 114.956C66.0789 114.956 66 115.036 66 115.135C66 115.234 66.0789 115.315 66.1762 115.315H70.6238C70.7211 115.315 70.8 115.234 70.8 115.135C70.8 115.036 70.7211 114.956 70.6238 114.956H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 103.089V107.62C68.2237 107.719 68.3026 107.799 68.3999 107.799C68.4972 107.799 68.5761 107.719 68.5761 107.62V103.089C68.5761 102.989 68.4972 102.909 68.3999 102.909C68.3026 102.909 68.2237 102.989 68.2237 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 105.175C66.0789 105.175 66 105.255 66 105.354C66 105.453 66.0789 105.534 66.1762 105.534H70.6238C70.7211 105.534 70.8 105.453 70.8 105.354C70.8 105.255 70.7211 105.175 70.6238 105.175H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M68.2237 93.3079V97.8392C68.2237 97.9384 68.3026 98.0187 68.3999 98.0187C68.4972 98.0187 68.5761 97.9384 68.5761 97.8392V93.3079C68.5761 93.2088 68.4972 93.1284 68.3999 93.1284C68.3026 93.1284 68.2237 93.2088 68.2237 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M66.1762 95.3942C66.0789 95.3942 66 95.4746 66 95.5737C66 95.6728 66.0789 95.7532 66.1762 95.7532H70.6238C70.7211 95.7532 70.8 95.6728 70.8 95.5737C70.8 95.4746 70.7211 95.3942 70.6238 95.3942H66.1762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 259.579V264.111C77.8238 264.21 77.9027 264.29 78 264.29C78.0973 264.29 78.1762 264.21 78.1762 264.111V259.579C78.1762 259.48 78.0973 259.4 78 259.4C77.9027 259.4 77.8238 259.48 77.8238 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 261.666C75.6788 261.666 75.5999 261.746 75.5999 261.845C75.5999 261.944 75.6788 262.025 75.7761 262.025H80.2237C80.321 262.025 80.3999 261.944 80.3999 261.845C80.3999 261.746 80.321 261.666 80.2237 261.666H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 249.799V254.33C77.8238 254.429 77.9027 254.509 78 254.509C78.0973 254.509 78.1762 254.429 78.1762 254.33V249.799C78.1762 249.699 78.0973 249.619 78 249.619C77.9027 249.619 77.8238 249.699 77.8238 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 251.885C75.6788 251.885 75.5999 251.965 75.5999 252.064C75.5999 252.163 75.6788 252.244 75.7761 252.244H80.2237C80.321 252.244 80.3999 252.163 80.3999 252.064C80.3999 251.965 80.321 251.885 80.2237 251.885H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 240.018V244.549C77.8238 244.648 77.9027 244.729 78 244.729C78.0973 244.729 78.1762 244.648 78.1762 244.549V240.018C78.1762 239.919 78.0973 239.838 78 239.838C77.9027 239.838 77.8238 239.919 77.8238 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 242.104C75.6788 242.104 75.5999 242.184 75.5999 242.284C75.5999 242.383 75.6788 242.463 75.7761 242.463H80.2237C80.321 242.463 80.3999 242.383 80.3999 242.284C80.3999 242.184 80.321 242.104 80.2237 242.104H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 230.237V234.769C77.8238 234.868 77.9027 234.948 78 234.948C78.0973 234.948 78.1762 234.868 78.1762 234.769V230.237C78.1762 230.138 78.0973 230.058 78 230.058C77.9027 230.058 77.8238 230.138 77.8238 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 232.323C75.6788 232.323 75.5999 232.404 75.5999 232.503C75.5999 232.602 75.6788 232.682 75.7761 232.682H80.2237C80.321 232.682 80.3999 232.602 80.3999 232.503C80.3999 232.404 80.321 232.323 80.2237 232.323H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 220.457V224.988C77.8238 225.087 77.9027 225.167 78 225.167C78.0973 225.167 78.1762 225.087 78.1762 224.988V220.457C78.1762 220.357 78.0973 220.277 78 220.277C77.9027 220.277 77.8238 220.357 77.8238 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 222.543C75.6788 222.543 75.5999 222.623 75.5999 222.722C75.5999 222.821 75.6788 222.902 75.7761 222.902H80.2237C80.321 222.902 80.3999 222.821 80.3999 222.722C80.3999 222.623 80.321 222.543 80.2237 222.543H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 210.676V215.207C77.8238 215.306 77.9027 215.387 78 215.387C78.0973 215.387 78.1762 215.306 78.1762 215.207V210.676C78.1762 210.577 78.0973 210.496 78 210.496C77.9027 210.496 77.8238 210.577 77.8238 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 212.762C75.6788 212.762 75.5999 212.842 75.5999 212.942C75.5999 213.041 75.6788 213.121 75.7761 213.121H80.2237C80.321 213.121 80.3999 213.041 80.3999 212.942C80.3999 212.842 80.321 212.762 80.2237 212.762H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 200.895V205.427C77.8238 205.526 77.9027 205.606 78 205.606C78.0973 205.606 78.1762 205.526 78.1762 205.427V200.895C78.1762 200.796 78.0973 200.716 78 200.716C77.9027 200.716 77.8238 200.796 77.8238 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 202.981C75.6788 202.981 75.5999 203.062 75.5999 203.161C75.5999 203.26 75.6788 203.34 75.7761 203.34H80.2237C80.321 203.34 80.3999 203.26 80.3999 203.161C80.3999 203.062 80.321 202.981 80.2237 202.981H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 191.115V195.646C77.8238 195.745 77.9027 195.825 78 195.825C78.0973 195.825 78.1762 195.745 78.1762 195.646V191.115C78.1762 191.016 78.0973 190.935 78 190.935C77.9027 190.935 77.8238 191.016 77.8238 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 193.201C75.6788 193.201 75.5999 193.281 75.5999 193.38C75.5999 193.479 75.6788 193.56 75.7761 193.56H80.2237C80.321 193.56 80.3999 193.479 80.3999 193.38C80.3999 193.281 80.321 193.201 80.2237 193.201H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 181.334V185.865C77.8238 185.964 77.9027 186.045 78 186.045C78.0973 186.045 78.1762 185.964 78.1762 185.865V181.334C78.1762 181.235 78.0973 181.154 78 181.154C77.9027 181.154 77.8238 181.235 77.8238 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 183.42C75.6788 183.42 75.5999 183.5 75.5999 183.6C75.5999 183.699 75.6788 183.779 75.7761 183.779H80.2237C80.321 183.779 80.3999 183.699 80.3999 183.6C80.3999 183.5 80.321 183.42 80.2237 183.42H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 171.553V176.085C77.8238 176.184 77.9027 176.264 78 176.264C78.0973 176.264 78.1762 176.184 78.1762 176.085V171.553C78.1762 171.454 78.0973 171.374 78 171.374C77.9027 171.374 77.8238 171.454 77.8238 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 173.639C75.6788 173.639 75.5999 173.72 75.5999 173.819C75.5999 173.918 75.6788 173.998 75.7761 173.998H80.2237C80.321 173.998 80.3999 173.918 80.3999 173.819C80.3999 173.72 80.321 173.639 80.2237 173.639H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 161.773V166.304C77.8238 166.403 77.9027 166.483 78 166.483C78.0973 166.483 78.1762 166.403 78.1762 166.304V161.773C78.1762 161.674 78.0973 161.593 78 161.593C77.9027 161.593 77.8238 161.674 77.8238 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 163.859C75.6788 163.859 75.5999 163.939 75.5999 164.038C75.5999 164.137 75.6788 164.218 75.7761 164.218H80.2237C80.321 164.218 80.3999 164.137 80.3999 164.038C80.3999 163.939 80.321 163.859 80.2237 163.859H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 151.992V156.523C77.8238 156.622 77.9027 156.703 78 156.703C78.0973 156.703 78.1762 156.622 78.1762 156.523V151.992C78.1762 151.893 78.0973 151.812 78 151.812C77.9027 151.812 77.8238 151.893 77.8238 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 154.078C75.6788 154.078 75.5999 154.158 75.5999 154.258C75.5999 154.357 75.6788 154.437 75.7761 154.437H80.2237C80.321 154.437 80.3999 154.357 80.3999 154.258C80.3999 154.158 80.321 154.078 80.2237 154.078H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 142.211V146.743C77.8238 146.842 77.9027 146.922 78 146.922C78.0973 146.922 78.1762 146.842 78.1762 146.743V142.211C78.1762 142.112 78.0973 142.032 78 142.032C77.9027 142.032 77.8238 142.112 77.8238 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 144.297C75.6788 144.297 75.5999 144.378 75.5999 144.477C75.5999 144.576 75.6788 144.657 75.7761 144.657H80.2237C80.321 144.657 80.3999 144.576 80.3999 144.477C80.3999 144.378 80.321 144.297 80.2237 144.297H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 132.431V136.962C77.8238 137.061 77.9027 137.141 78 137.141C78.0973 137.141 78.1762 137.061 78.1762 136.962V132.431C78.1762 132.331 78.0973 132.251 78 132.251C77.9027 132.251 77.8238 132.331 77.8238 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 134.517C75.6788 134.517 75.5999 134.597 75.5999 134.696C75.5999 134.795 75.6788 134.876 75.7761 134.876H80.2237C80.321 134.876 80.3999 134.795 80.3999 134.696C80.3999 134.597 80.321 134.517 80.2237 134.517H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 122.65V127.181C77.8238 127.28 77.9027 127.361 78 127.361C78.0973 127.361 78.1762 127.28 78.1762 127.181V122.65C78.1762 122.551 78.0973 122.47 78 122.47C77.9027 122.47 77.8238 122.551 77.8238 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 124.736C75.6788 124.736 75.5999 124.817 75.5999 124.916C75.5999 125.015 75.6788 125.095 75.7761 125.095H80.2237C80.321 125.095 80.3999 125.015 80.3999 124.916C80.3999 124.817 80.321 124.736 80.2237 124.736H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 112.869V117.401C77.8238 117.5 77.9027 117.58 78 117.58C78.0973 117.58 78.1762 117.5 78.1762 117.401V112.869C78.1762 112.77 78.0973 112.69 78 112.69C77.9027 112.69 77.8238 112.77 77.8238 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 114.956C75.6788 114.956 75.5999 115.036 75.5999 115.135C75.5999 115.234 75.6788 115.315 75.7761 115.315H80.2237C80.321 115.315 80.3999 115.234 80.3999 115.135C80.3999 115.036 80.321 114.956 80.2237 114.956H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 103.089V107.62C77.8238 107.719 77.9027 107.799 78 107.799C78.0973 107.799 78.1762 107.719 78.1762 107.62V103.089C78.1762 102.989 78.0973 102.909 78 102.909C77.9027 102.909 77.8238 102.989 77.8238 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 105.175C75.6788 105.175 75.5999 105.255 75.5999 105.354C75.5999 105.453 75.6788 105.534 75.7761 105.534H80.2237C80.321 105.534 80.3999 105.453 80.3999 105.354C80.3999 105.255 80.321 105.175 80.2237 105.175H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M77.8238 93.3079V97.8392C77.8238 97.9384 77.9027 98.0187 78 98.0187C78.0973 98.0187 78.1762 97.9384 78.1762 97.8392V93.3079C78.1762 93.2088 78.0973 93.1284 78 93.1284C77.9027 93.1284 77.8238 93.2088 77.8238 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M75.7761 95.3942C75.6788 95.3942 75.5999 95.4746 75.5999 95.5737C75.5999 95.6728 75.6788 95.7532 75.7761 95.7532H80.2237C80.321 95.7532 80.3999 95.6728 80.3999 95.5737C80.3999 95.4746 80.321 95.3942 80.2237 95.3942H75.7761Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 259.579V264.111C87.4237 264.21 87.5026 264.29 87.5999 264.29C87.6972 264.29 87.7761 264.21 87.7761 264.111V259.579C87.7761 259.48 87.6972 259.4 87.5999 259.4C87.5026 259.4 87.4237 259.48 87.4237 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 261.666C85.2789 261.666 85.2 261.746 85.2 261.845C85.2 261.944 85.2789 262.025 85.3762 262.025H89.8238C89.9211 262.025 90 261.944 90 261.845C90 261.746 89.9211 261.666 89.8238 261.666H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 249.799V254.33C87.4237 254.429 87.5026 254.509 87.5999 254.509C87.6972 254.509 87.7761 254.429 87.7761 254.33V249.799C87.7761 249.699 87.6972 249.619 87.5999 249.619C87.5026 249.619 87.4237 249.699 87.4237 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 251.885C85.2788 251.885 85.2 251.965 85.2 252.064C85.2 252.163 85.2788 252.244 85.3762 252.244H89.8238C89.9211 252.244 90 252.163 90 252.064C90 251.965 89.9211 251.885 89.8238 251.885H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 240.018V244.549C87.4237 244.648 87.5026 244.729 87.5999 244.729C87.6972 244.729 87.7761 244.648 87.7761 244.549V240.018C87.7761 239.919 87.6972 239.838 87.5999 239.838C87.5026 239.838 87.4237 239.919 87.4237 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 242.104C85.2788 242.104 85.2 242.184 85.2 242.284C85.2 242.383 85.2788 242.463 85.3762 242.463H89.8238C89.9211 242.463 90 242.383 90 242.284C90 242.184 89.9211 242.104 89.8238 242.104H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 230.237V234.769C87.4237 234.868 87.5026 234.948 87.5999 234.948C87.6972 234.948 87.7761 234.868 87.7761 234.769V230.237C87.7761 230.138 87.6972 230.058 87.5999 230.058C87.5026 230.058 87.4237 230.138 87.4237 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 232.323C85.2788 232.323 85.2 232.404 85.2 232.503C85.2 232.602 85.2788 232.682 85.3762 232.682H89.8238C89.9211 232.682 90 232.602 90 232.503C90 232.404 89.9211 232.323 89.8238 232.323H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 220.457V224.988C87.4237 225.087 87.5026 225.167 87.5999 225.167C87.6972 225.167 87.7761 225.087 87.7761 224.988V220.457C87.7761 220.357 87.6972 220.277 87.5999 220.277C87.5026 220.277 87.4237 220.357 87.4237 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 222.543C85.2788 222.543 85.2 222.623 85.2 222.722C85.2 222.821 85.2788 222.902 85.3762 222.902H89.8238C89.9211 222.902 90 222.821 90 222.722C90 222.623 89.9211 222.543 89.8238 222.543H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 210.676V215.207C87.4237 215.306 87.5026 215.387 87.5999 215.387C87.6972 215.387 87.7761 215.306 87.7761 215.207V210.676C87.7761 210.577 87.6972 210.496 87.5999 210.496C87.5026 210.496 87.4237 210.577 87.4237 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 212.762C85.2788 212.762 85.2 212.842 85.2 212.942C85.2 213.041 85.2788 213.121 85.3762 213.121H89.8238C89.9211 213.121 90 213.041 90 212.942C90 212.842 89.9211 212.762 89.8238 212.762H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 200.895V205.427C87.4237 205.526 87.5026 205.606 87.5999 205.606C87.6972 205.606 87.7761 205.526 87.7761 205.427V200.895C87.7761 200.796 87.6972 200.716 87.5999 200.716C87.5026 200.716 87.4237 200.796 87.4237 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 202.981C85.2788 202.981 85.2 203.062 85.2 203.161C85.2 203.26 85.2788 203.34 85.3762 203.34H89.8238C89.9211 203.34 90 203.26 90 203.161C90 203.062 89.9211 202.981 89.8238 202.981H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 191.115V195.646C87.4237 195.745 87.5026 195.825 87.5999 195.825C87.6972 195.825 87.7761 195.745 87.7761 195.646V191.115C87.7761 191.016 87.6972 190.935 87.5999 190.935C87.5026 190.935 87.4237 191.016 87.4237 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 193.201C85.2788 193.201 85.2 193.281 85.2 193.38C85.2 193.479 85.2788 193.56 85.3762 193.56H89.8238C89.9211 193.56 90 193.479 90 193.38C90 193.281 89.9211 193.201 89.8238 193.201H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 181.334V185.865C87.4237 185.964 87.5026 186.045 87.5999 186.045C87.6972 186.045 87.7761 185.964 87.7761 185.865V181.334C87.7761 181.235 87.6972 181.154 87.5999 181.154C87.5026 181.154 87.4237 181.235 87.4237 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 183.42C85.2788 183.42 85.2 183.5 85.2 183.6C85.2 183.699 85.2788 183.779 85.3762 183.779H89.8238C89.9211 183.779 90 183.699 90 183.6C90 183.5 89.9211 183.42 89.8238 183.42H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 171.553V176.085C87.4237 176.184 87.5026 176.264 87.5999 176.264C87.6972 176.264 87.7761 176.184 87.7761 176.085V171.553C87.7761 171.454 87.6972 171.374 87.5999 171.374C87.5026 171.374 87.4237 171.454 87.4237 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 173.639C85.2788 173.639 85.2 173.72 85.2 173.819C85.2 173.918 85.2788 173.998 85.3762 173.998H89.8238C89.9211 173.998 90 173.918 90 173.819C90 173.72 89.9211 173.639 89.8238 173.639H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 161.773V166.304C87.4237 166.403 87.5026 166.483 87.5999 166.483C87.6972 166.483 87.7761 166.403 87.7761 166.304V161.773C87.7761 161.674 87.6972 161.593 87.5999 161.593C87.5026 161.593 87.4237 161.674 87.4237 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 163.859C85.2788 163.859 85.2 163.939 85.2 164.038C85.2 164.137 85.2788 164.218 85.3762 164.218H89.8238C89.9211 164.218 90 164.137 90 164.038C90 163.939 89.9211 163.859 89.8238 163.859H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 151.992V156.523C87.4237 156.622 87.5026 156.703 87.5999 156.703C87.6972 156.703 87.7761 156.622 87.7761 156.523V151.992C87.7761 151.893 87.6972 151.812 87.5999 151.812C87.5026 151.812 87.4237 151.893 87.4237 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 154.078C85.2788 154.078 85.2 154.158 85.2 154.258C85.2 154.357 85.2788 154.437 85.3762 154.437H89.8238C89.9211 154.437 90 154.357 90 154.258C90 154.158 89.9211 154.078 89.8238 154.078H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 142.211V146.743C87.4237 146.842 87.5026 146.922 87.5999 146.922C87.6972 146.922 87.7761 146.842 87.7761 146.743V142.211C87.7761 142.112 87.6972 142.032 87.5999 142.032C87.5026 142.032 87.4237 142.112 87.4237 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 144.297C85.2788 144.297 85.2 144.378 85.2 144.477C85.2 144.576 85.2788 144.657 85.3762 144.657H89.8238C89.9211 144.657 90 144.576 90 144.477C90 144.378 89.9211 144.297 89.8238 144.297H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 132.431V136.962C87.4237 137.061 87.5026 137.141 87.5999 137.141C87.6972 137.141 87.7761 137.061 87.7761 136.962V132.431C87.7761 132.331 87.6972 132.251 87.5999 132.251C87.5026 132.251 87.4237 132.331 87.4237 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 134.517C85.2788 134.517 85.2 134.597 85.2 134.696C85.2 134.795 85.2788 134.876 85.3762 134.876H89.8238C89.9211 134.876 90 134.795 90 134.696C90 134.597 89.9211 134.517 89.8238 134.517H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 122.65V127.181C87.4237 127.28 87.5026 127.361 87.5999 127.361C87.6972 127.361 87.7761 127.28 87.7761 127.181V122.65C87.7761 122.551 87.6972 122.47 87.5999 122.47C87.5026 122.47 87.4237 122.551 87.4237 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 124.736C85.2788 124.736 85.2 124.817 85.2 124.916C85.2 125.015 85.2788 125.095 85.3762 125.095H89.8238C89.9211 125.095 90 125.015 90 124.916C90 124.817 89.9211 124.736 89.8238 124.736H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 112.869V117.401C87.4237 117.5 87.5026 117.58 87.5999 117.58C87.6972 117.58 87.7761 117.5 87.7761 117.401V112.869C87.7761 112.77 87.6972 112.69 87.5999 112.69C87.5026 112.69 87.4237 112.77 87.4237 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 114.956C85.2788 114.956 85.2 115.036 85.2 115.135C85.2 115.234 85.2788 115.315 85.3762 115.315H89.8238C89.9211 115.315 90 115.234 90 115.135C90 115.036 89.9211 114.956 89.8238 114.956H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 103.089V107.62C87.4237 107.719 87.5026 107.799 87.5999 107.799C87.6972 107.799 87.7761 107.719 87.7761 107.62V103.089C87.7761 102.989 87.6972 102.909 87.5999 102.909C87.5026 102.909 87.4237 102.989 87.4237 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 105.175C85.2788 105.175 85.2 105.255 85.2 105.354C85.2 105.453 85.2788 105.534 85.3762 105.534H89.8238C89.9211 105.534 90 105.453 90 105.354C90 105.255 89.9211 105.175 89.8238 105.175H85.3762Z"
        fill={colorConfig.grill}
      />
      <path
        d="M87.4237 93.3079V97.8392C87.4237 97.9384 87.5026 98.0187 87.5999 98.0187C87.6972 98.0187 87.7761 97.9384 87.7761 97.8392V93.3079C87.7761 93.2088 87.6972 93.1284 87.5999 93.1284C87.5026 93.1284 87.4237 93.2088 87.4237 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M85.3762 95.3942C85.2788 95.3942 85.2 95.4746 85.2 95.5737C85.2 95.6728 85.2788 95.7532 85.3762 95.7532H89.8238C89.9211 95.7532 90 95.6728 90 95.5737C90 95.4746 89.9211 95.3942 89.8238 95.3942H85.3762Z"
        fill={colorConfig.grill}
      />
      <mask id="path-110-inside-48_1077_273" fill="white">
        <path d="M339 91H367V413H339V91Z" />
      </mask>
      <path d="M339 91H367V413H339V91Z" fill={colorConfig.block_fill} />
      <path
        d="M339 91V90H338V91H339ZM339 413H338V414H339V413ZM339 91V92H367V91V90H339V91ZM367 413V412H339V413V414H367V413ZM339 413H340V91H339H338V413H339Z"
        fill={colorConfig.block_stroke}
        mask="url(#path-110-inside-48_1077_273)"
      />
      <path
        d="M344.224 406.289V410.82C344.224 410.92 344.303 411 344.4 411C344.497 411 344.576 410.92 344.576 410.82V406.289C344.576 406.19 344.497 406.11 344.4 406.11C344.303 406.11 344.224 406.19 344.224 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 408.375C342.079 408.375 342 408.456 342 408.555C342 408.654 342.079 408.734 342.176 408.734H346.624C346.721 408.734 346.8 408.654 346.8 408.555C346.8 408.456 346.721 408.375 346.624 408.375H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 396.508V401.04C344.224 401.139 344.303 401.219 344.4 401.219C344.497 401.219 344.576 401.139 344.576 401.04V396.508C344.576 396.409 344.497 396.329 344.4 396.329C344.303 396.329 344.224 396.409 344.224 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 398.595C342.079 398.595 342 398.675 342 398.774C342 398.873 342.079 398.954 342.176 398.954H346.624C346.721 398.954 346.8 398.873 346.8 398.774C346.8 398.675 346.721 398.595 346.624 398.595H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 386.728V391.259C344.224 391.358 344.303 391.439 344.4 391.439C344.497 391.439 344.576 391.358 344.576 391.259V386.728C344.576 386.629 344.497 386.548 344.4 386.548C344.303 386.548 344.224 386.629 344.224 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 388.814C342.079 388.814 342 388.894 342 388.994C342 389.093 342.079 389.173 342.176 389.173H346.624C346.721 389.173 346.8 389.093 346.8 388.994C346.8 388.894 346.721 388.814 346.624 388.814H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 376.947V381.479C344.224 381.578 344.303 381.658 344.4 381.658C344.497 381.658 344.576 381.578 344.576 381.479V376.947C344.576 376.848 344.497 376.768 344.4 376.768C344.303 376.768 344.224 376.848 344.224 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 379.033C342.079 379.033 342 379.114 342 379.213C342 379.312 342.079 379.392 342.176 379.392H346.624C346.721 379.392 346.8 379.312 346.8 379.213C346.8 379.114 346.721 379.033 346.624 379.033H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 367.167V371.698C344.224 371.797 344.303 371.877 344.4 371.877C344.497 371.877 344.576 371.797 344.576 371.698V367.167C344.576 367.067 344.497 366.987 344.4 366.987C344.303 366.987 344.224 367.067 344.224 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 369.253C342.079 369.253 342 369.333 342 369.432C342 369.531 342.079 369.612 342.176 369.612H346.624C346.721 369.612 346.8 369.531 346.8 369.432C346.8 369.333 346.721 369.253 346.624 369.253H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 357.386V361.917C344.224 362.016 344.303 362.097 344.4 362.097C344.497 362.097 344.576 362.016 344.576 361.917V357.386C344.576 357.287 344.497 357.206 344.4 357.206C344.303 357.206 344.224 357.287 344.224 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 359.472C342.079 359.472 342 359.552 342 359.652C342 359.751 342.079 359.831 342.176 359.831H346.624C346.721 359.831 346.8 359.751 346.8 359.652C346.8 359.552 346.721 359.472 346.624 359.472H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 347.605V352.137C344.224 352.236 344.303 352.316 344.4 352.316C344.497 352.316 344.576 352.236 344.576 352.137V347.605C344.576 347.506 344.497 347.426 344.4 347.426C344.303 347.426 344.224 347.506 344.224 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 349.691C342.079 349.691 342 349.772 342 349.871C342 349.97 342.079 350.05 342.176 350.05H346.624C346.721 350.05 346.8 349.97 346.8 349.871C346.8 349.772 346.721 349.691 346.624 349.691H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 337.825V342.356C344.224 342.455 344.303 342.535 344.4 342.535C344.497 342.535 344.576 342.455 344.576 342.356V337.825C344.576 337.725 344.497 337.645 344.4 337.645C344.303 337.645 344.224 337.725 344.224 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 339.911C342.079 339.911 342 339.991 342 340.09C342 340.189 342.079 340.27 342.176 340.27H346.624C346.721 340.27 346.8 340.189 346.8 340.09C346.8 339.991 346.721 339.911 346.624 339.911H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 328.044V332.575C344.224 332.674 344.303 332.755 344.4 332.755C344.497 332.755 344.576 332.674 344.576 332.575V328.044C344.576 327.945 344.497 327.864 344.4 327.864C344.303 327.864 344.224 327.945 344.224 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 330.13C342.079 330.13 342 330.21 342 330.31C342 330.409 342.079 330.489 342.176 330.489H346.624C346.721 330.489 346.8 330.409 346.8 330.31C346.8 330.21 346.721 330.13 346.624 330.13H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 318.263V322.795C344.224 322.894 344.303 322.974 344.4 322.974C344.497 322.974 344.576 322.894 344.576 322.795V318.263C344.576 318.164 344.497 318.084 344.4 318.084C344.303 318.084 344.224 318.164 344.224 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 320.349C342.079 320.349 342 320.43 342 320.529C342 320.628 342.079 320.708 342.176 320.708H346.624C346.721 320.708 346.8 320.628 346.8 320.529C346.8 320.43 346.721 320.349 346.624 320.349H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 308.483V313.014C344.224 313.113 344.303 313.193 344.4 313.193C344.497 313.193 344.576 313.113 344.576 313.014V308.483C344.576 308.383 344.497 308.303 344.4 308.303C344.303 308.303 344.224 308.383 344.224 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 310.569C342.079 310.569 342 310.649 342 310.748C342 310.847 342.079 310.928 342.176 310.928H346.624C346.721 310.928 346.8 310.847 346.8 310.748C346.8 310.649 346.721 310.569 346.624 310.569H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 298.702V303.233C344.224 303.332 344.303 303.413 344.4 303.413C344.497 303.413 344.576 303.332 344.576 303.233V298.702C344.576 298.603 344.497 298.522 344.4 298.522C344.303 298.522 344.224 298.603 344.224 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 300.788C342.079 300.788 342 300.869 342 300.968C342 301.067 342.079 301.147 342.176 301.147H346.624C346.721 301.147 346.8 301.067 346.8 300.968C346.8 300.869 346.721 300.788 346.624 300.788H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 288.921V293.453C344.224 293.552 344.303 293.632 344.4 293.632C344.497 293.632 344.576 293.552 344.576 293.453V288.921C344.576 288.822 344.497 288.742 344.4 288.742C344.303 288.742 344.224 288.822 344.224 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 291.008C342.079 291.008 342 291.088 342 291.187C342 291.286 342.079 291.367 342.176 291.367H346.624C346.721 291.367 346.8 291.286 346.8 291.187C346.8 291.088 346.721 291.008 346.624 291.008H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 279.14V283.672C344.224 283.771 344.303 283.851 344.4 283.851C344.497 283.851 344.576 283.771 344.576 283.672V279.14C344.576 279.041 344.497 278.961 344.4 278.961C344.303 278.961 344.224 279.041 344.224 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 281.227C342.079 281.227 342 281.307 342 281.406C342 281.505 342.079 281.586 342.176 281.586H346.624C346.721 281.586 346.8 281.505 346.8 281.406C346.8 281.307 346.721 281.227 346.624 281.227H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 269.36V273.891C344.224 273.99 344.303 274.071 344.4 274.071C344.497 274.071 344.576 273.99 344.576 273.891V269.36C344.576 269.261 344.497 269.18 344.4 269.18C344.303 269.18 344.224 269.261 344.224 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 271.446C342.079 271.446 342 271.526 342 271.626C342 271.725 342.079 271.805 342.176 271.805H346.624C346.721 271.805 346.8 271.725 346.8 271.626C346.8 271.526 346.721 271.446 346.624 271.446H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 259.579V264.111C344.224 264.21 344.303 264.29 344.4 264.29C344.497 264.29 344.576 264.21 344.576 264.111V259.579C344.576 259.48 344.497 259.4 344.4 259.4C344.303 259.4 344.224 259.48 344.224 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 261.666C342.079 261.666 342 261.746 342 261.845C342 261.944 342.079 262.025 342.176 262.025H346.624C346.721 262.025 346.8 261.944 346.8 261.845C346.8 261.746 346.721 261.666 346.624 261.666H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 406.289V410.82C353.824 410.92 353.903 411 354 411C354.097 411 354.176 410.92 354.176 410.82V406.289C354.176 406.19 354.097 406.11 354 406.11C353.903 406.11 353.824 406.19 353.824 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 408.375C351.679 408.375 351.6 408.456 351.6 408.555C351.6 408.654 351.679 408.734 351.776 408.734H356.224C356.321 408.734 356.4 408.654 356.4 408.555C356.4 408.456 356.321 408.375 356.224 408.375H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 396.508V401.04C353.824 401.139 353.903 401.219 354 401.219C354.097 401.219 354.176 401.139 354.176 401.04V396.508C354.176 396.409 354.097 396.329 354 396.329C353.903 396.329 353.824 396.409 353.824 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 398.595C351.679 398.595 351.6 398.675 351.6 398.774C351.6 398.873 351.679 398.954 351.776 398.954H356.224C356.321 398.954 356.4 398.873 356.4 398.774C356.4 398.675 356.321 398.595 356.224 398.595H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 386.728V391.259C353.824 391.358 353.903 391.439 354 391.439C354.097 391.439 354.176 391.358 354.176 391.259V386.728C354.176 386.629 354.097 386.548 354 386.548C353.903 386.548 353.824 386.629 353.824 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 388.814C351.679 388.814 351.6 388.894 351.6 388.994C351.6 389.093 351.679 389.173 351.776 389.173H356.224C356.321 389.173 356.4 389.093 356.4 388.994C356.4 388.894 356.321 388.814 356.224 388.814H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 376.947V381.479C353.824 381.578 353.903 381.658 354 381.658C354.097 381.658 354.176 381.578 354.176 381.479V376.947C354.176 376.848 354.097 376.768 354 376.768C353.903 376.768 353.824 376.848 353.824 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 379.033C351.679 379.033 351.6 379.114 351.6 379.213C351.6 379.312 351.679 379.392 351.776 379.392H356.224C356.321 379.392 356.4 379.312 356.4 379.213C356.4 379.114 356.321 379.033 356.224 379.033H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 367.167V371.698C353.824 371.797 353.903 371.877 354 371.877C354.097 371.877 354.176 371.797 354.176 371.698V367.167C354.176 367.067 354.097 366.987 354 366.987C353.903 366.987 353.824 367.067 353.824 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 369.253C351.679 369.253 351.6 369.333 351.6 369.432C351.6 369.531 351.679 369.612 351.776 369.612H356.224C356.321 369.612 356.4 369.531 356.4 369.432C356.4 369.333 356.321 369.253 356.224 369.253H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 357.386V361.917C353.824 362.016 353.903 362.097 354 362.097C354.097 362.097 354.176 362.016 354.176 361.917V357.386C354.176 357.287 354.097 357.206 354 357.206C353.903 357.206 353.824 357.287 353.824 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 359.472C351.679 359.472 351.6 359.552 351.6 359.652C351.6 359.751 351.679 359.831 351.776 359.831H356.224C356.321 359.831 356.4 359.751 356.4 359.652C356.4 359.552 356.321 359.472 356.224 359.472H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 347.605V352.137C353.824 352.236 353.903 352.316 354 352.316C354.097 352.316 354.176 352.236 354.176 352.137V347.605C354.176 347.506 354.097 347.426 354 347.426C353.903 347.426 353.824 347.506 353.824 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 349.691C351.679 349.691 351.6 349.772 351.6 349.871C351.6 349.97 351.679 350.05 351.776 350.05H356.224C356.321 350.05 356.4 349.97 356.4 349.871C356.4 349.772 356.321 349.691 356.224 349.691H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 337.825V342.356C353.824 342.455 353.903 342.535 354 342.535C354.097 342.535 354.176 342.455 354.176 342.356V337.825C354.176 337.725 354.097 337.645 354 337.645C353.903 337.645 353.824 337.725 353.824 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 339.911C351.679 339.911 351.6 339.991 351.6 340.09C351.6 340.189 351.679 340.27 351.776 340.27H356.224C356.321 340.27 356.4 340.189 356.4 340.09C356.4 339.991 356.321 339.911 356.224 339.911H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 328.044V332.575C353.824 332.674 353.903 332.755 354 332.755C354.097 332.755 354.176 332.674 354.176 332.575V328.044C354.176 327.945 354.097 327.864 354 327.864C353.903 327.864 353.824 327.945 353.824 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 330.13C351.679 330.13 351.6 330.21 351.6 330.31C351.6 330.409 351.679 330.489 351.776 330.489H356.224C356.321 330.489 356.4 330.409 356.4 330.31C356.4 330.21 356.321 330.13 356.224 330.13H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 318.263V322.795C353.824 322.894 353.903 322.974 354 322.974C354.097 322.974 354.176 322.894 354.176 322.795V318.263C354.176 318.164 354.097 318.084 354 318.084C353.903 318.084 353.824 318.164 353.824 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 320.349C351.679 320.349 351.6 320.43 351.6 320.529C351.6 320.628 351.679 320.708 351.776 320.708H356.224C356.321 320.708 356.4 320.628 356.4 320.529C356.4 320.43 356.321 320.349 356.224 320.349H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 308.483V313.014C353.824 313.113 353.903 313.193 354 313.193C354.097 313.193 354.176 313.113 354.176 313.014V308.483C354.176 308.383 354.097 308.303 354 308.303C353.903 308.303 353.824 308.383 353.824 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 310.569C351.679 310.569 351.6 310.649 351.6 310.748C351.6 310.847 351.679 310.928 351.776 310.928H356.224C356.321 310.928 356.4 310.847 356.4 310.748C356.4 310.649 356.321 310.569 356.224 310.569H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 298.702V303.233C353.824 303.332 353.903 303.413 354 303.413C354.097 303.413 354.176 303.332 354.176 303.233V298.702C354.176 298.603 354.097 298.522 354 298.522C353.903 298.522 353.824 298.603 353.824 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 300.788C351.679 300.788 351.6 300.869 351.6 300.968C351.6 301.067 351.679 301.147 351.776 301.147H356.224C356.321 301.147 356.4 301.067 356.4 300.968C356.4 300.869 356.321 300.788 356.224 300.788H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 288.921V293.453C353.824 293.552 353.903 293.632 354 293.632C354.097 293.632 354.176 293.552 354.176 293.453V288.921C354.176 288.822 354.097 288.742 354 288.742C353.903 288.742 353.824 288.822 353.824 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 291.008C351.679 291.008 351.6 291.088 351.6 291.187C351.6 291.286 351.679 291.367 351.776 291.367H356.224C356.321 291.367 356.4 291.286 356.4 291.187C356.4 291.088 356.321 291.008 356.224 291.008H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 279.14V283.672C353.824 283.771 353.903 283.851 354 283.851C354.097 283.851 354.176 283.771 354.176 283.672V279.14C354.176 279.041 354.097 278.961 354 278.961C353.903 278.961 353.824 279.041 353.824 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 281.227C351.679 281.227 351.6 281.307 351.6 281.406C351.6 281.505 351.679 281.586 351.776 281.586H356.224C356.321 281.586 356.4 281.505 356.4 281.406C356.4 281.307 356.321 281.227 356.224 281.227H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 269.36V273.891C353.824 273.99 353.903 274.071 354 274.071C354.097 274.071 354.176 273.99 354.176 273.891V269.36C354.176 269.261 354.097 269.18 354 269.18C353.903 269.18 353.824 269.261 353.824 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 271.446C351.679 271.446 351.6 271.526 351.6 271.626C351.6 271.725 351.679 271.805 351.776 271.805H356.224C356.321 271.805 356.4 271.725 356.4 271.626C356.4 271.526 356.321 271.446 356.224 271.446H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 259.579V264.111C353.824 264.21 353.903 264.29 354 264.29C354.097 264.29 354.176 264.21 354.176 264.111V259.579C354.176 259.48 354.097 259.4 354 259.4C353.903 259.4 353.824 259.48 353.824 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 261.666C351.679 261.666 351.6 261.746 351.6 261.845C351.6 261.944 351.679 262.025 351.776 262.025H356.224C356.321 262.025 356.4 261.944 356.4 261.845C356.4 261.746 356.321 261.666 356.224 261.666H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 406.289V410.82C363.424 410.92 363.503 411 363.6 411C363.697 411 363.776 410.92 363.776 410.82V406.289C363.776 406.19 363.697 406.11 363.6 406.11C363.503 406.11 363.424 406.19 363.424 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 408.375C361.279 408.375 361.2 408.456 361.2 408.555C361.2 408.654 361.279 408.734 361.376 408.734H365.824C365.921 408.734 366 408.654 366 408.555C366 408.456 365.921 408.375 365.824 408.375H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 396.508V401.04C363.424 401.139 363.503 401.219 363.6 401.219C363.697 401.219 363.776 401.139 363.776 401.04V396.508C363.776 396.409 363.697 396.329 363.6 396.329C363.503 396.329 363.424 396.409 363.424 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 398.595C361.279 398.595 361.2 398.675 361.2 398.774C361.2 398.873 361.279 398.954 361.376 398.954H365.824C365.921 398.954 366 398.873 366 398.774C366 398.675 365.921 398.595 365.824 398.595H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 386.728V391.259C363.424 391.358 363.503 391.439 363.6 391.439C363.697 391.439 363.776 391.358 363.776 391.259V386.728C363.776 386.629 363.697 386.548 363.6 386.548C363.503 386.548 363.424 386.629 363.424 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 388.814C361.279 388.814 361.2 388.894 361.2 388.994C361.2 389.093 361.279 389.173 361.376 389.173H365.824C365.921 389.173 366 389.093 366 388.994C366 388.894 365.921 388.814 365.824 388.814H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 376.947V381.479C363.424 381.578 363.503 381.658 363.6 381.658C363.697 381.658 363.776 381.578 363.776 381.479V376.947C363.776 376.848 363.697 376.768 363.6 376.768C363.503 376.768 363.424 376.848 363.424 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 379.033C361.279 379.033 361.2 379.114 361.2 379.213C361.2 379.312 361.279 379.392 361.376 379.392H365.824C365.921 379.392 366 379.312 366 379.213C366 379.114 365.921 379.033 365.824 379.033H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 367.167V371.698C363.424 371.797 363.503 371.877 363.6 371.877C363.697 371.877 363.776 371.797 363.776 371.698V367.167C363.776 367.067 363.697 366.987 363.6 366.987C363.503 366.987 363.424 367.067 363.424 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 369.253C361.279 369.253 361.2 369.333 361.2 369.432C361.2 369.531 361.279 369.612 361.376 369.612H365.824C365.921 369.612 366 369.531 366 369.432C366 369.333 365.921 369.253 365.824 369.253H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 357.386V361.917C363.424 362.016 363.503 362.097 363.6 362.097C363.697 362.097 363.776 362.016 363.776 361.917V357.386C363.776 357.287 363.697 357.206 363.6 357.206C363.503 357.206 363.424 357.287 363.424 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 359.472C361.279 359.472 361.2 359.552 361.2 359.652C361.2 359.751 361.279 359.831 361.376 359.831H365.824C365.921 359.831 366 359.751 366 359.652C366 359.552 365.921 359.472 365.824 359.472H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 347.605V352.137C363.424 352.236 363.503 352.316 363.6 352.316C363.697 352.316 363.776 352.236 363.776 352.137V347.605C363.776 347.506 363.697 347.426 363.6 347.426C363.503 347.426 363.424 347.506 363.424 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 349.691C361.279 349.691 361.2 349.772 361.2 349.871C361.2 349.97 361.279 350.05 361.376 350.05H365.824C365.921 350.05 366 349.97 366 349.871C366 349.772 365.921 349.691 365.824 349.691H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 337.825V342.356C363.424 342.455 363.503 342.535 363.6 342.535C363.697 342.535 363.776 342.455 363.776 342.356V337.825C363.776 337.725 363.697 337.645 363.6 337.645C363.503 337.645 363.424 337.725 363.424 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 339.911C361.279 339.911 361.2 339.991 361.2 340.09C361.2 340.189 361.279 340.27 361.376 340.27H365.824C365.921 340.27 366 340.189 366 340.09C366 339.991 365.921 339.911 365.824 339.911H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 328.044V332.575C363.424 332.674 363.503 332.755 363.6 332.755C363.697 332.755 363.776 332.674 363.776 332.575V328.044C363.776 327.945 363.697 327.864 363.6 327.864C363.503 327.864 363.424 327.945 363.424 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 330.13C361.279 330.13 361.2 330.21 361.2 330.31C361.2 330.409 361.279 330.489 361.376 330.489H365.824C365.921 330.489 366 330.409 366 330.31C366 330.21 365.921 330.13 365.824 330.13H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 318.263V322.795C363.424 322.894 363.503 322.974 363.6 322.974C363.697 322.974 363.776 322.894 363.776 322.795V318.263C363.776 318.164 363.697 318.084 363.6 318.084C363.503 318.084 363.424 318.164 363.424 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 320.349C361.279 320.349 361.2 320.43 361.2 320.529C361.2 320.628 361.279 320.708 361.376 320.708H365.824C365.921 320.708 366 320.628 366 320.529C366 320.43 365.921 320.349 365.824 320.349H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 308.483V313.014C363.424 313.113 363.503 313.193 363.6 313.193C363.697 313.193 363.776 313.113 363.776 313.014V308.483C363.776 308.383 363.697 308.303 363.6 308.303C363.503 308.303 363.424 308.383 363.424 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 310.569C361.279 310.569 361.2 310.649 361.2 310.748C361.2 310.847 361.279 310.928 361.376 310.928H365.824C365.921 310.928 366 310.847 366 310.748C366 310.649 365.921 310.569 365.824 310.569H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 298.702V303.233C363.424 303.332 363.503 303.413 363.6 303.413C363.697 303.413 363.776 303.332 363.776 303.233V298.702C363.776 298.603 363.697 298.522 363.6 298.522C363.503 298.522 363.424 298.603 363.424 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 300.788C361.279 300.788 361.2 300.869 361.2 300.968C361.2 301.067 361.279 301.147 361.376 301.147H365.824C365.921 301.147 366 301.067 366 300.968C366 300.869 365.921 300.788 365.824 300.788H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 288.921V293.453C363.424 293.552 363.503 293.632 363.6 293.632C363.697 293.632 363.776 293.552 363.776 293.453V288.921C363.776 288.822 363.697 288.742 363.6 288.742C363.503 288.742 363.424 288.822 363.424 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 291.008C361.279 291.008 361.2 291.088 361.2 291.187C361.2 291.286 361.279 291.367 361.376 291.367H365.824C365.921 291.367 366 291.286 366 291.187C366 291.088 365.921 291.008 365.824 291.008H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 279.14V283.672C363.424 283.771 363.503 283.851 363.6 283.851C363.697 283.851 363.776 283.771 363.776 283.672V279.14C363.776 279.041 363.697 278.961 363.6 278.961C363.503 278.961 363.424 279.041 363.424 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 281.227C361.279 281.227 361.2 281.307 361.2 281.406C361.2 281.505 361.279 281.586 361.376 281.586H365.824C365.921 281.586 366 281.505 366 281.406C366 281.307 365.921 281.227 365.824 281.227H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 269.36V273.891C363.424 273.99 363.503 274.071 363.6 274.071C363.697 274.071 363.776 273.99 363.776 273.891V269.36C363.776 269.261 363.697 269.18 363.6 269.18C363.503 269.18 363.424 269.261 363.424 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 271.446C361.279 271.446 361.2 271.526 361.2 271.626C361.2 271.725 361.279 271.805 361.376 271.805H365.824C365.921 271.805 366 271.725 366 271.626C366 271.526 365.921 271.446 365.824 271.446H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 259.579V264.111C363.424 264.21 363.503 264.29 363.6 264.29C363.697 264.29 363.776 264.21 363.776 264.111V259.579C363.776 259.48 363.697 259.4 363.6 259.4C363.503 259.4 363.424 259.48 363.424 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 261.666C361.279 261.666 361.2 261.746 361.2 261.845C361.2 261.944 361.279 262.025 361.376 262.025H365.824C365.921 262.025 366 261.944 366 261.845C366 261.746 365.921 261.666 365.824 261.666H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 259.579V264.111C344.224 264.21 344.303 264.29 344.4 264.29C344.497 264.29 344.576 264.21 344.576 264.111V259.579C344.576 259.48 344.497 259.4 344.4 259.4C344.303 259.4 344.224 259.48 344.224 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 261.666C342.079 261.666 342 261.746 342 261.845C342 261.944 342.079 262.025 342.176 262.025H346.624C346.721 262.025 346.8 261.944 346.8 261.845C346.8 261.746 346.721 261.666 346.624 261.666H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 249.799V254.33C344.224 254.429 344.303 254.509 344.4 254.509C344.497 254.509 344.576 254.429 344.576 254.33V249.799C344.576 249.699 344.497 249.619 344.4 249.619C344.303 249.619 344.224 249.699 344.224 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 251.885C342.079 251.885 342 251.965 342 252.064C342 252.163 342.079 252.244 342.176 252.244H346.624C346.721 252.244 346.8 252.163 346.8 252.064C346.8 251.965 346.721 251.885 346.624 251.885H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 240.018V244.549C344.224 244.648 344.303 244.729 344.4 244.729C344.497 244.729 344.576 244.648 344.576 244.549V240.018C344.576 239.919 344.497 239.838 344.4 239.838C344.303 239.838 344.224 239.919 344.224 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 242.104C342.079 242.104 342 242.184 342 242.284C342 242.383 342.079 242.463 342.176 242.463H346.624C346.721 242.463 346.8 242.383 346.8 242.284C346.8 242.184 346.721 242.104 346.624 242.104H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 230.237V234.769C344.224 234.868 344.303 234.948 344.4 234.948C344.497 234.948 344.576 234.868 344.576 234.769V230.237C344.576 230.138 344.497 230.058 344.4 230.058C344.303 230.058 344.224 230.138 344.224 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 232.323C342.079 232.323 342 232.404 342 232.503C342 232.602 342.079 232.682 342.176 232.682H346.624C346.721 232.682 346.8 232.602 346.8 232.503C346.8 232.404 346.721 232.323 346.624 232.323H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 220.457V224.988C344.224 225.087 344.303 225.167 344.4 225.167C344.497 225.167 344.576 225.087 344.576 224.988V220.457C344.576 220.357 344.497 220.277 344.4 220.277C344.303 220.277 344.224 220.357 344.224 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 222.543C342.079 222.543 342 222.623 342 222.722C342 222.821 342.079 222.902 342.176 222.902H346.624C346.721 222.902 346.8 222.821 346.8 222.722C346.8 222.623 346.721 222.543 346.624 222.543H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 210.676V215.207C344.224 215.306 344.303 215.387 344.4 215.387C344.497 215.387 344.576 215.306 344.576 215.207V210.676C344.576 210.577 344.497 210.496 344.4 210.496C344.303 210.496 344.224 210.577 344.224 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 212.762C342.079 212.762 342 212.842 342 212.942C342 213.041 342.079 213.121 342.176 213.121H346.624C346.721 213.121 346.8 213.041 346.8 212.942C346.8 212.842 346.721 212.762 346.624 212.762H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 200.895V205.427C344.224 205.526 344.303 205.606 344.4 205.606C344.497 205.606 344.576 205.526 344.576 205.427V200.895C344.576 200.796 344.497 200.716 344.4 200.716C344.303 200.716 344.224 200.796 344.224 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 202.981C342.079 202.981 342 203.062 342 203.161C342 203.26 342.079 203.34 342.176 203.34H346.624C346.721 203.34 346.8 203.26 346.8 203.161C346.8 203.062 346.721 202.981 346.624 202.981H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 191.115V195.646C344.224 195.745 344.303 195.825 344.4 195.825C344.497 195.825 344.576 195.745 344.576 195.646V191.115C344.576 191.016 344.497 190.935 344.4 190.935C344.303 190.935 344.224 191.016 344.224 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 193.201C342.079 193.201 342 193.281 342 193.38C342 193.479 342.079 193.56 342.176 193.56H346.624C346.721 193.56 346.8 193.479 346.8 193.38C346.8 193.281 346.721 193.201 346.624 193.201H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 181.334V185.865C344.224 185.964 344.303 186.045 344.4 186.045C344.497 186.045 344.576 185.964 344.576 185.865V181.334C344.576 181.235 344.497 181.154 344.4 181.154C344.303 181.154 344.224 181.235 344.224 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 183.42C342.079 183.42 342 183.5 342 183.6C342 183.699 342.079 183.779 342.176 183.779H346.624C346.721 183.779 346.8 183.699 346.8 183.6C346.8 183.5 346.721 183.42 346.624 183.42H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 171.553V176.085C344.224 176.184 344.303 176.264 344.4 176.264C344.497 176.264 344.576 176.184 344.576 176.085V171.553C344.576 171.454 344.497 171.374 344.4 171.374C344.303 171.374 344.224 171.454 344.224 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 173.639C342.079 173.639 342 173.72 342 173.819C342 173.918 342.079 173.998 342.176 173.998H346.624C346.721 173.998 346.8 173.918 346.8 173.819C346.8 173.72 346.721 173.639 346.624 173.639H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 161.773V166.304C344.224 166.403 344.303 166.483 344.4 166.483C344.497 166.483 344.576 166.403 344.576 166.304V161.773C344.576 161.674 344.497 161.593 344.4 161.593C344.303 161.593 344.224 161.674 344.224 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 163.859C342.079 163.859 342 163.939 342 164.038C342 164.137 342.079 164.218 342.176 164.218H346.624C346.721 164.218 346.8 164.137 346.8 164.038C346.8 163.939 346.721 163.859 346.624 163.859H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 151.992V156.523C344.224 156.622 344.303 156.703 344.4 156.703C344.497 156.703 344.576 156.622 344.576 156.523V151.992C344.576 151.893 344.497 151.812 344.4 151.812C344.303 151.812 344.224 151.893 344.224 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 154.078C342.079 154.078 342 154.158 342 154.258C342 154.357 342.079 154.437 342.176 154.437H346.624C346.721 154.437 346.8 154.357 346.8 154.258C346.8 154.158 346.721 154.078 346.624 154.078H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 142.211V146.743C344.224 146.842 344.303 146.922 344.4 146.922C344.497 146.922 344.576 146.842 344.576 146.743V142.211C344.576 142.112 344.497 142.032 344.4 142.032C344.303 142.032 344.224 142.112 344.224 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 144.297C342.079 144.297 342 144.378 342 144.477C342 144.576 342.079 144.657 342.176 144.657H346.624C346.721 144.657 346.8 144.576 346.8 144.477C346.8 144.378 346.721 144.297 346.624 144.297H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 132.431V136.962C344.224 137.061 344.303 137.141 344.4 137.141C344.497 137.141 344.576 137.061 344.576 136.962V132.431C344.576 132.331 344.497 132.251 344.4 132.251C344.303 132.251 344.224 132.331 344.224 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 134.517C342.079 134.517 342 134.597 342 134.696C342 134.795 342.079 134.876 342.176 134.876H346.624C346.721 134.876 346.8 134.795 346.8 134.696C346.8 134.597 346.721 134.517 346.624 134.517H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 122.65V127.181C344.224 127.28 344.303 127.361 344.4 127.361C344.497 127.361 344.576 127.28 344.576 127.181V122.65C344.576 122.551 344.497 122.47 344.4 122.47C344.303 122.47 344.224 122.551 344.224 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 124.736C342.079 124.736 342 124.817 342 124.916C342 125.015 342.079 125.095 342.176 125.095H346.624C346.721 125.095 346.8 125.015 346.8 124.916C346.8 124.817 346.721 124.736 346.624 124.736H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 112.869V117.401C344.224 117.5 344.303 117.58 344.4 117.58C344.497 117.58 344.576 117.5 344.576 117.401V112.869C344.576 112.77 344.497 112.69 344.4 112.69C344.303 112.69 344.224 112.77 344.224 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 114.956C342.079 114.956 342 115.036 342 115.135C342 115.234 342.079 115.315 342.176 115.315H346.624C346.721 115.315 346.8 115.234 346.8 115.135C346.8 115.036 346.721 114.956 346.624 114.956H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 103.089V107.62C344.224 107.719 344.303 107.799 344.4 107.799C344.497 107.799 344.576 107.719 344.576 107.62V103.089C344.576 102.989 344.497 102.909 344.4 102.909C344.303 102.909 344.224 102.989 344.224 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 105.175C342.079 105.175 342 105.255 342 105.354C342 105.453 342.079 105.534 342.176 105.534H346.624C346.721 105.534 346.8 105.453 346.8 105.354C346.8 105.255 346.721 105.175 346.624 105.175H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M344.224 93.3079V97.8392C344.224 97.9384 344.303 98.0187 344.4 98.0187C344.497 98.0187 344.576 97.9384 344.576 97.8392V93.3079C344.576 93.2088 344.497 93.1284 344.4 93.1284C344.303 93.1284 344.224 93.2088 344.224 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M342.176 95.3942C342.079 95.3942 342 95.4746 342 95.5737C342 95.6728 342.079 95.7532 342.176 95.7532H346.624C346.721 95.7532 346.8 95.6728 346.8 95.5737C346.8 95.4746 346.721 95.3942 346.624 95.3942H342.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 259.579V264.111C353.824 264.21 353.903 264.29 354 264.29C354.097 264.29 354.176 264.21 354.176 264.111V259.579C354.176 259.48 354.097 259.4 354 259.4C353.903 259.4 353.824 259.48 353.824 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 261.666C351.679 261.666 351.6 261.746 351.6 261.845C351.6 261.944 351.679 262.025 351.776 262.025H356.224C356.321 262.025 356.4 261.944 356.4 261.845C356.4 261.746 356.321 261.666 356.224 261.666H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 249.799V254.33C353.824 254.429 353.903 254.509 354 254.509C354.097 254.509 354.176 254.429 354.176 254.33V249.799C354.176 249.699 354.097 249.619 354 249.619C353.903 249.619 353.824 249.699 353.824 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 251.885C351.679 251.885 351.6 251.965 351.6 252.064C351.6 252.163 351.679 252.244 351.776 252.244H356.224C356.321 252.244 356.4 252.163 356.4 252.064C356.4 251.965 356.321 251.885 356.224 251.885H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 240.018V244.549C353.824 244.648 353.903 244.729 354 244.729C354.097 244.729 354.176 244.648 354.176 244.549V240.018C354.176 239.919 354.097 239.838 354 239.838C353.903 239.838 353.824 239.919 353.824 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 242.104C351.679 242.104 351.6 242.184 351.6 242.284C351.6 242.383 351.679 242.463 351.776 242.463H356.224C356.321 242.463 356.4 242.383 356.4 242.284C356.4 242.184 356.321 242.104 356.224 242.104H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 230.237V234.769C353.824 234.868 353.903 234.948 354 234.948C354.097 234.948 354.176 234.868 354.176 234.769V230.237C354.176 230.138 354.097 230.058 354 230.058C353.903 230.058 353.824 230.138 353.824 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 232.323C351.679 232.323 351.6 232.404 351.6 232.503C351.6 232.602 351.679 232.682 351.776 232.682H356.224C356.321 232.682 356.4 232.602 356.4 232.503C356.4 232.404 356.321 232.323 356.224 232.323H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 220.457V224.988C353.824 225.087 353.903 225.167 354 225.167C354.097 225.167 354.176 225.087 354.176 224.988V220.457C354.176 220.357 354.097 220.277 354 220.277C353.903 220.277 353.824 220.357 353.824 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 222.543C351.679 222.543 351.6 222.623 351.6 222.722C351.6 222.821 351.679 222.902 351.776 222.902H356.224C356.321 222.902 356.4 222.821 356.4 222.722C356.4 222.623 356.321 222.543 356.224 222.543H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 210.676V215.207C353.824 215.306 353.903 215.387 354 215.387C354.097 215.387 354.176 215.306 354.176 215.207V210.676C354.176 210.577 354.097 210.496 354 210.496C353.903 210.496 353.824 210.577 353.824 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 212.762C351.679 212.762 351.6 212.842 351.6 212.942C351.6 213.041 351.679 213.121 351.776 213.121H356.224C356.321 213.121 356.4 213.041 356.4 212.942C356.4 212.842 356.321 212.762 356.224 212.762H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 200.895V205.427C353.824 205.526 353.903 205.606 354 205.606C354.097 205.606 354.176 205.526 354.176 205.427V200.895C354.176 200.796 354.097 200.716 354 200.716C353.903 200.716 353.824 200.796 353.824 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 202.981C351.679 202.981 351.6 203.062 351.6 203.161C351.6 203.26 351.679 203.34 351.776 203.34H356.224C356.321 203.34 356.4 203.26 356.4 203.161C356.4 203.062 356.321 202.981 356.224 202.981H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 191.115V195.646C353.824 195.745 353.903 195.825 354 195.825C354.097 195.825 354.176 195.745 354.176 195.646V191.115C354.176 191.016 354.097 190.935 354 190.935C353.903 190.935 353.824 191.016 353.824 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 193.201C351.679 193.201 351.6 193.281 351.6 193.38C351.6 193.479 351.679 193.56 351.776 193.56H356.224C356.321 193.56 356.4 193.479 356.4 193.38C356.4 193.281 356.321 193.201 356.224 193.201H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 181.334V185.865C353.824 185.964 353.903 186.045 354 186.045C354.097 186.045 354.176 185.964 354.176 185.865V181.334C354.176 181.235 354.097 181.154 354 181.154C353.903 181.154 353.824 181.235 353.824 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 183.42C351.679 183.42 351.6 183.5 351.6 183.6C351.6 183.699 351.679 183.779 351.776 183.779H356.224C356.321 183.779 356.4 183.699 356.4 183.6C356.4 183.5 356.321 183.42 356.224 183.42H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 171.553V176.085C353.824 176.184 353.903 176.264 354 176.264C354.097 176.264 354.176 176.184 354.176 176.085V171.553C354.176 171.454 354.097 171.374 354 171.374C353.903 171.374 353.824 171.454 353.824 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 173.639C351.679 173.639 351.6 173.72 351.6 173.819C351.6 173.918 351.679 173.998 351.776 173.998H356.224C356.321 173.998 356.4 173.918 356.4 173.819C356.4 173.72 356.321 173.639 356.224 173.639H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 161.773V166.304C353.824 166.403 353.903 166.483 354 166.483C354.097 166.483 354.176 166.403 354.176 166.304V161.773C354.176 161.674 354.097 161.593 354 161.593C353.903 161.593 353.824 161.674 353.824 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 163.859C351.679 163.859 351.6 163.939 351.6 164.038C351.6 164.137 351.679 164.218 351.776 164.218H356.224C356.321 164.218 356.4 164.137 356.4 164.038C356.4 163.939 356.321 163.859 356.224 163.859H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 151.992V156.523C353.824 156.622 353.903 156.703 354 156.703C354.097 156.703 354.176 156.622 354.176 156.523V151.992C354.176 151.893 354.097 151.812 354 151.812C353.903 151.812 353.824 151.893 353.824 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 154.078C351.679 154.078 351.6 154.158 351.6 154.258C351.6 154.357 351.679 154.437 351.776 154.437H356.224C356.321 154.437 356.4 154.357 356.4 154.258C356.4 154.158 356.321 154.078 356.224 154.078H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 142.211V146.743C353.824 146.842 353.903 146.922 354 146.922C354.097 146.922 354.176 146.842 354.176 146.743V142.211C354.176 142.112 354.097 142.032 354 142.032C353.903 142.032 353.824 142.112 353.824 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 144.297C351.679 144.297 351.6 144.378 351.6 144.477C351.6 144.576 351.679 144.657 351.776 144.657H356.224C356.321 144.657 356.4 144.576 356.4 144.477C356.4 144.378 356.321 144.297 356.224 144.297H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 132.431V136.962C353.824 137.061 353.903 137.141 354 137.141C354.097 137.141 354.176 137.061 354.176 136.962V132.431C354.176 132.331 354.097 132.251 354 132.251C353.903 132.251 353.824 132.331 353.824 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 134.517C351.679 134.517 351.6 134.597 351.6 134.696C351.6 134.795 351.679 134.876 351.776 134.876H356.224C356.321 134.876 356.4 134.795 356.4 134.696C356.4 134.597 356.321 134.517 356.224 134.517H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 122.65V127.181C353.824 127.28 353.903 127.361 354 127.361C354.097 127.361 354.176 127.28 354.176 127.181V122.65C354.176 122.551 354.097 122.47 354 122.47C353.903 122.47 353.824 122.551 353.824 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 124.736C351.679 124.736 351.6 124.817 351.6 124.916C351.6 125.015 351.679 125.095 351.776 125.095H356.224C356.321 125.095 356.4 125.015 356.4 124.916C356.4 124.817 356.321 124.736 356.224 124.736H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 112.869V117.401C353.824 117.5 353.903 117.58 354 117.58C354.097 117.58 354.176 117.5 354.176 117.401V112.869C354.176 112.77 354.097 112.69 354 112.69C353.903 112.69 353.824 112.77 353.824 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 114.956C351.679 114.956 351.6 115.036 351.6 115.135C351.6 115.234 351.679 115.315 351.776 115.315H356.224C356.321 115.315 356.4 115.234 356.4 115.135C356.4 115.036 356.321 114.956 356.224 114.956H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 103.089V107.62C353.824 107.719 353.903 107.799 354 107.799C354.097 107.799 354.176 107.719 354.176 107.62V103.089C354.176 102.989 354.097 102.909 354 102.909C353.903 102.909 353.824 102.989 353.824 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 105.175C351.679 105.175 351.6 105.255 351.6 105.354C351.6 105.453 351.679 105.534 351.776 105.534H356.224C356.321 105.534 356.4 105.453 356.4 105.354C356.4 105.255 356.321 105.175 356.224 105.175H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M353.824 93.3079V97.8392C353.824 97.9384 353.903 98.0187 354 98.0187C354.097 98.0187 354.176 97.9384 354.176 97.8392V93.3079C354.176 93.2088 354.097 93.1284 354 93.1284C353.903 93.1284 353.824 93.2088 353.824 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M351.776 95.3942C351.679 95.3942 351.6 95.4746 351.6 95.5737C351.6 95.6728 351.679 95.7532 351.776 95.7532H356.224C356.321 95.7532 356.4 95.6728 356.4 95.5737C356.4 95.4746 356.321 95.3942 356.224 95.3942H351.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 259.579V264.111C363.424 264.21 363.503 264.29 363.6 264.29C363.697 264.29 363.776 264.21 363.776 264.111V259.579C363.776 259.48 363.697 259.4 363.6 259.4C363.503 259.4 363.424 259.48 363.424 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 261.666C361.279 261.666 361.2 261.746 361.2 261.845C361.2 261.944 361.279 262.025 361.376 262.025H365.824C365.921 262.025 366 261.944 366 261.845C366 261.746 365.921 261.666 365.824 261.666H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 249.799V254.33C363.424 254.429 363.503 254.509 363.6 254.509C363.697 254.509 363.776 254.429 363.776 254.33V249.799C363.776 249.699 363.697 249.619 363.6 249.619C363.503 249.619 363.424 249.699 363.424 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 251.885C361.279 251.885 361.2 251.965 361.2 252.064C361.2 252.163 361.279 252.244 361.376 252.244H365.824C365.921 252.244 366 252.163 366 252.064C366 251.965 365.921 251.885 365.824 251.885H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 240.018V244.549C363.424 244.648 363.503 244.729 363.6 244.729C363.697 244.729 363.776 244.648 363.776 244.549V240.018C363.776 239.919 363.697 239.838 363.6 239.838C363.503 239.838 363.424 239.919 363.424 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 242.104C361.279 242.104 361.2 242.184 361.2 242.284C361.2 242.383 361.279 242.463 361.376 242.463H365.824C365.921 242.463 366 242.383 366 242.284C366 242.184 365.921 242.104 365.824 242.104H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 230.237V234.769C363.424 234.868 363.503 234.948 363.6 234.948C363.697 234.948 363.776 234.868 363.776 234.769V230.237C363.776 230.138 363.697 230.058 363.6 230.058C363.503 230.058 363.424 230.138 363.424 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 232.323C361.279 232.323 361.2 232.404 361.2 232.503C361.2 232.602 361.279 232.682 361.376 232.682H365.824C365.921 232.682 366 232.602 366 232.503C366 232.404 365.921 232.323 365.824 232.323H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 220.457V224.988C363.424 225.087 363.503 225.167 363.6 225.167C363.697 225.167 363.776 225.087 363.776 224.988V220.457C363.776 220.357 363.697 220.277 363.6 220.277C363.503 220.277 363.424 220.357 363.424 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 222.543C361.279 222.543 361.2 222.623 361.2 222.722C361.2 222.821 361.279 222.902 361.376 222.902H365.824C365.921 222.902 366 222.821 366 222.722C366 222.623 365.921 222.543 365.824 222.543H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 210.676V215.207C363.424 215.306 363.503 215.387 363.6 215.387C363.697 215.387 363.776 215.306 363.776 215.207V210.676C363.776 210.577 363.697 210.496 363.6 210.496C363.503 210.496 363.424 210.577 363.424 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 212.762C361.279 212.762 361.2 212.842 361.2 212.942C361.2 213.041 361.279 213.121 361.376 213.121H365.824C365.921 213.121 366 213.041 366 212.942C366 212.842 365.921 212.762 365.824 212.762H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 200.895V205.427C363.424 205.526 363.503 205.606 363.6 205.606C363.697 205.606 363.776 205.526 363.776 205.427V200.895C363.776 200.796 363.697 200.716 363.6 200.716C363.503 200.716 363.424 200.796 363.424 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 202.981C361.279 202.981 361.2 203.062 361.2 203.161C361.2 203.26 361.279 203.34 361.376 203.34H365.824C365.921 203.34 366 203.26 366 203.161C366 203.062 365.921 202.981 365.824 202.981H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 191.115V195.646C363.424 195.745 363.503 195.825 363.6 195.825C363.697 195.825 363.776 195.745 363.776 195.646V191.115C363.776 191.016 363.697 190.935 363.6 190.935C363.503 190.935 363.424 191.016 363.424 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 193.201C361.279 193.201 361.2 193.281 361.2 193.38C361.2 193.479 361.279 193.56 361.376 193.56H365.824C365.921 193.56 366 193.479 366 193.38C366 193.281 365.921 193.201 365.824 193.201H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 181.334V185.865C363.424 185.964 363.503 186.045 363.6 186.045C363.697 186.045 363.776 185.964 363.776 185.865V181.334C363.776 181.235 363.697 181.154 363.6 181.154C363.503 181.154 363.424 181.235 363.424 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 183.42C361.279 183.42 361.2 183.5 361.2 183.6C361.2 183.699 361.279 183.779 361.376 183.779H365.824C365.921 183.779 366 183.699 366 183.6C366 183.5 365.921 183.42 365.824 183.42H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 171.553V176.085C363.424 176.184 363.503 176.264 363.6 176.264C363.697 176.264 363.776 176.184 363.776 176.085V171.553C363.776 171.454 363.697 171.374 363.6 171.374C363.503 171.374 363.424 171.454 363.424 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 173.639C361.279 173.639 361.2 173.72 361.2 173.819C361.2 173.918 361.279 173.998 361.376 173.998H365.824C365.921 173.998 366 173.918 366 173.819C366 173.72 365.921 173.639 365.824 173.639H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 161.773V166.304C363.424 166.403 363.503 166.483 363.6 166.483C363.697 166.483 363.776 166.403 363.776 166.304V161.773C363.776 161.674 363.697 161.593 363.6 161.593C363.503 161.593 363.424 161.674 363.424 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 163.859C361.279 163.859 361.2 163.939 361.2 164.038C361.2 164.137 361.279 164.218 361.376 164.218H365.824C365.921 164.218 366 164.137 366 164.038C366 163.939 365.921 163.859 365.824 163.859H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 151.992V156.523C363.424 156.622 363.503 156.703 363.6 156.703C363.697 156.703 363.776 156.622 363.776 156.523V151.992C363.776 151.893 363.697 151.812 363.6 151.812C363.503 151.812 363.424 151.893 363.424 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 154.078C361.279 154.078 361.2 154.158 361.2 154.258C361.2 154.357 361.279 154.437 361.376 154.437H365.824C365.921 154.437 366 154.357 366 154.258C366 154.158 365.921 154.078 365.824 154.078H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 142.211V146.743C363.424 146.842 363.503 146.922 363.6 146.922C363.697 146.922 363.776 146.842 363.776 146.743V142.211C363.776 142.112 363.697 142.032 363.6 142.032C363.503 142.032 363.424 142.112 363.424 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 144.297C361.279 144.297 361.2 144.378 361.2 144.477C361.2 144.576 361.279 144.657 361.376 144.657H365.824C365.921 144.657 366 144.576 366 144.477C366 144.378 365.921 144.297 365.824 144.297H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 132.431V136.962C363.424 137.061 363.503 137.141 363.6 137.141C363.697 137.141 363.776 137.061 363.776 136.962V132.431C363.776 132.331 363.697 132.251 363.6 132.251C363.503 132.251 363.424 132.331 363.424 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 134.517C361.279 134.517 361.2 134.597 361.2 134.696C361.2 134.795 361.279 134.876 361.376 134.876H365.824C365.921 134.876 366 134.795 366 134.696C366 134.597 365.921 134.517 365.824 134.517H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 122.65V127.181C363.424 127.28 363.503 127.361 363.6 127.361C363.697 127.361 363.776 127.28 363.776 127.181V122.65C363.776 122.551 363.697 122.47 363.6 122.47C363.503 122.47 363.424 122.551 363.424 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 124.736C361.279 124.736 361.2 124.817 361.2 124.916C361.2 125.015 361.279 125.095 361.376 125.095H365.824C365.921 125.095 366 125.015 366 124.916C366 124.817 365.921 124.736 365.824 124.736H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 112.869V117.401C363.424 117.5 363.503 117.58 363.6 117.58C363.697 117.58 363.776 117.5 363.776 117.401V112.869C363.776 112.77 363.697 112.69 363.6 112.69C363.503 112.69 363.424 112.77 363.424 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 114.956C361.279 114.956 361.2 115.036 361.2 115.135C361.2 115.234 361.279 115.315 361.376 115.315H365.824C365.921 115.315 366 115.234 366 115.135C366 115.036 365.921 114.956 365.824 114.956H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 103.089V107.62C363.424 107.719 363.503 107.799 363.6 107.799C363.697 107.799 363.776 107.719 363.776 107.62V103.089C363.776 102.989 363.697 102.909 363.6 102.909C363.503 102.909 363.424 102.989 363.424 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 105.175C361.279 105.175 361.2 105.255 361.2 105.354C361.2 105.453 361.279 105.534 361.376 105.534H365.824C365.921 105.534 366 105.453 366 105.354C366 105.255 365.921 105.175 365.824 105.175H361.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M363.424 93.3079V97.8392C363.424 97.9384 363.503 98.0187 363.6 98.0187C363.697 98.0187 363.776 97.9384 363.776 97.8392V93.3079C363.776 93.2088 363.697 93.1284 363.6 93.1284C363.503 93.1284 363.424 93.2088 363.424 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M361.376 95.3942C361.279 95.3942 361.2 95.4746 361.2 95.5737C361.2 95.6728 361.279 95.7532 361.376 95.7532H365.824C365.921 95.7532 366 95.6728 366 95.5737C366 95.4746 365.921 95.3942 365.824 95.3942H361.376Z"
        fill={colorConfig.grill}
      />
      <mask id="path-113-inside-49_1077_273" fill="white">
        <path d="M218 91H246V413H218V91Z" />
      </mask>
      <path d="M218 91H246V413H218V91Z" fill={colorConfig.block_fill} />
      <path
        d="M246 91H247V90H246V91ZM246 413V414H247V413H246ZM218 91V92H246V91V90H218V91ZM246 91H245V413H246H247V91H246ZM246 413V412H218V413V414H246V413Z"
        fill={colorConfig.block_stroke}
        mask="url(#path-113-inside-49_1077_273)"
      />
      <path
        d="M221.224 406.289V410.82C221.224 410.92 221.303 411 221.4 411C221.497 411 221.576 410.92 221.576 410.82V406.289C221.576 406.19 221.497 406.11 221.4 406.11C221.303 406.11 221.224 406.19 221.224 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 408.375C219.079 408.375 219 408.456 219 408.555C219 408.654 219.079 408.734 219.176 408.734H223.624C223.721 408.734 223.8 408.654 223.8 408.555C223.8 408.456 223.721 408.375 223.624 408.375H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 396.508V401.04C221.224 401.139 221.303 401.219 221.4 401.219C221.497 401.219 221.576 401.139 221.576 401.04V396.508C221.576 396.409 221.497 396.329 221.4 396.329C221.303 396.329 221.224 396.409 221.224 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 398.595C219.079 398.595 219 398.675 219 398.774C219 398.873 219.079 398.954 219.176 398.954H223.624C223.721 398.954 223.8 398.873 223.8 398.774C223.8 398.675 223.721 398.595 223.624 398.595H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 386.728V391.259C221.224 391.358 221.303 391.439 221.4 391.439C221.497 391.439 221.576 391.358 221.576 391.259V386.728C221.576 386.629 221.497 386.548 221.4 386.548C221.303 386.548 221.224 386.629 221.224 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 388.814C219.079 388.814 219 388.894 219 388.994C219 389.093 219.079 389.173 219.176 389.173H223.624C223.721 389.173 223.8 389.093 223.8 388.994C223.8 388.894 223.721 388.814 223.624 388.814H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 376.947V381.479C221.224 381.578 221.303 381.658 221.4 381.658C221.497 381.658 221.576 381.578 221.576 381.479V376.947C221.576 376.848 221.497 376.768 221.4 376.768C221.303 376.768 221.224 376.848 221.224 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 379.033C219.079 379.033 219 379.114 219 379.213C219 379.312 219.079 379.392 219.176 379.392H223.624C223.721 379.392 223.8 379.312 223.8 379.213C223.8 379.114 223.721 379.033 223.624 379.033H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 367.167V371.698C221.224 371.797 221.303 371.877 221.4 371.877C221.497 371.877 221.576 371.797 221.576 371.698V367.167C221.576 367.067 221.497 366.987 221.4 366.987C221.303 366.987 221.224 367.067 221.224 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 369.253C219.079 369.253 219 369.333 219 369.432C219 369.531 219.079 369.612 219.176 369.612H223.624C223.721 369.612 223.8 369.531 223.8 369.432C223.8 369.333 223.721 369.253 223.624 369.253H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 357.386V361.917C221.224 362.016 221.303 362.097 221.4 362.097C221.497 362.097 221.576 362.016 221.576 361.917V357.386C221.576 357.287 221.497 357.206 221.4 357.206C221.303 357.206 221.224 357.287 221.224 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 359.472C219.079 359.472 219 359.552 219 359.652C219 359.751 219.079 359.831 219.176 359.831H223.624C223.721 359.831 223.8 359.751 223.8 359.652C223.8 359.552 223.721 359.472 223.624 359.472H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 347.605V352.137C221.224 352.236 221.303 352.316 221.4 352.316C221.497 352.316 221.576 352.236 221.576 352.137V347.605C221.576 347.506 221.497 347.426 221.4 347.426C221.303 347.426 221.224 347.506 221.224 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 349.691C219.079 349.691 219 349.772 219 349.871C219 349.97 219.079 350.05 219.176 350.05H223.624C223.721 350.05 223.8 349.97 223.8 349.871C223.8 349.772 223.721 349.691 223.624 349.691H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 337.825V342.356C221.224 342.455 221.303 342.535 221.4 342.535C221.497 342.535 221.576 342.455 221.576 342.356V337.825C221.576 337.725 221.497 337.645 221.4 337.645C221.303 337.645 221.224 337.725 221.224 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 339.911C219.079 339.911 219 339.991 219 340.09C219 340.189 219.079 340.27 219.176 340.27H223.624C223.721 340.27 223.8 340.189 223.8 340.09C223.8 339.991 223.721 339.911 223.624 339.911H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 328.044V332.575C221.224 332.674 221.303 332.755 221.4 332.755C221.497 332.755 221.576 332.674 221.576 332.575V328.044C221.576 327.945 221.497 327.864 221.4 327.864C221.303 327.864 221.224 327.945 221.224 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 330.13C219.079 330.13 219 330.21 219 330.31C219 330.409 219.079 330.489 219.176 330.489H223.624C223.721 330.489 223.8 330.409 223.8 330.31C223.8 330.21 223.721 330.13 223.624 330.13H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 318.263V322.795C221.224 322.894 221.303 322.974 221.4 322.974C221.497 322.974 221.576 322.894 221.576 322.795V318.263C221.576 318.164 221.497 318.084 221.4 318.084C221.303 318.084 221.224 318.164 221.224 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 320.349C219.079 320.349 219 320.43 219 320.529C219 320.628 219.079 320.708 219.176 320.708H223.624C223.721 320.708 223.8 320.628 223.8 320.529C223.8 320.43 223.721 320.349 223.624 320.349H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 308.483V313.014C221.224 313.113 221.303 313.193 221.4 313.193C221.497 313.193 221.576 313.113 221.576 313.014V308.483C221.576 308.383 221.497 308.303 221.4 308.303C221.303 308.303 221.224 308.383 221.224 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 310.569C219.079 310.569 219 310.649 219 310.748C219 310.847 219.079 310.928 219.176 310.928H223.624C223.721 310.928 223.8 310.847 223.8 310.748C223.8 310.649 223.721 310.569 223.624 310.569H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 298.702V303.233C221.224 303.332 221.303 303.413 221.4 303.413C221.497 303.413 221.576 303.332 221.576 303.233V298.702C221.576 298.603 221.497 298.522 221.4 298.522C221.303 298.522 221.224 298.603 221.224 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 300.788C219.079 300.788 219 300.869 219 300.968C219 301.067 219.079 301.147 219.176 301.147H223.624C223.721 301.147 223.8 301.067 223.8 300.968C223.8 300.869 223.721 300.788 223.624 300.788H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 288.921V293.453C221.224 293.552 221.303 293.632 221.4 293.632C221.497 293.632 221.576 293.552 221.576 293.453V288.921C221.576 288.822 221.497 288.742 221.4 288.742C221.303 288.742 221.224 288.822 221.224 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 291.008C219.079 291.008 219 291.088 219 291.187C219 291.286 219.079 291.367 219.176 291.367H223.624C223.721 291.367 223.8 291.286 223.8 291.187C223.8 291.088 223.721 291.008 223.624 291.008H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 279.14V283.672C221.224 283.771 221.303 283.851 221.4 283.851C221.497 283.851 221.576 283.771 221.576 283.672V279.14C221.576 279.041 221.497 278.961 221.4 278.961C221.303 278.961 221.224 279.041 221.224 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 281.227C219.079 281.227 219 281.307 219 281.406C219 281.505 219.079 281.586 219.176 281.586H223.624C223.721 281.586 223.8 281.505 223.8 281.406C223.8 281.307 223.721 281.227 223.624 281.227H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 269.36V273.891C221.224 273.99 221.303 274.071 221.4 274.071C221.497 274.071 221.576 273.99 221.576 273.891V269.36C221.576 269.261 221.497 269.18 221.4 269.18C221.303 269.18 221.224 269.261 221.224 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 271.446C219.079 271.446 219 271.526 219 271.626C219 271.725 219.079 271.805 219.176 271.805H223.624C223.721 271.805 223.8 271.725 223.8 271.626C223.8 271.526 223.721 271.446 223.624 271.446H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 259.579V264.111C221.224 264.21 221.303 264.29 221.4 264.29C221.497 264.29 221.576 264.21 221.576 264.111V259.579C221.576 259.48 221.497 259.4 221.4 259.4C221.303 259.4 221.224 259.48 221.224 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 261.666C219.079 261.666 219 261.746 219 261.845C219 261.944 219.079 262.025 219.176 262.025H223.624C223.721 262.025 223.8 261.944 223.8 261.845C223.8 261.746 223.721 261.666 223.624 261.666H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 406.289V410.82C230.824 410.92 230.903 411 231 411C231.097 411 231.176 410.92 231.176 410.82V406.289C231.176 406.19 231.097 406.11 231 406.11C230.903 406.11 230.824 406.19 230.824 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 408.375C228.679 408.375 228.6 408.456 228.6 408.555C228.6 408.654 228.679 408.734 228.776 408.734H233.224C233.321 408.734 233.4 408.654 233.4 408.555C233.4 408.456 233.321 408.375 233.224 408.375H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 396.508V401.04C230.824 401.139 230.903 401.219 231 401.219C231.097 401.219 231.176 401.139 231.176 401.04V396.508C231.176 396.409 231.097 396.329 231 396.329C230.903 396.329 230.824 396.409 230.824 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 398.595C228.679 398.595 228.6 398.675 228.6 398.774C228.6 398.873 228.679 398.954 228.776 398.954H233.224C233.321 398.954 233.4 398.873 233.4 398.774C233.4 398.675 233.321 398.595 233.224 398.595H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 386.728V391.259C230.824 391.358 230.903 391.439 231 391.439C231.097 391.439 231.176 391.358 231.176 391.259V386.728C231.176 386.629 231.097 386.548 231 386.548C230.903 386.548 230.824 386.629 230.824 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 388.814C228.679 388.814 228.6 388.894 228.6 388.994C228.6 389.093 228.679 389.173 228.776 389.173H233.224C233.321 389.173 233.4 389.093 233.4 388.994C233.4 388.894 233.321 388.814 233.224 388.814H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 376.947V381.479C230.824 381.578 230.903 381.658 231 381.658C231.097 381.658 231.176 381.578 231.176 381.479V376.947C231.176 376.848 231.097 376.768 231 376.768C230.903 376.768 230.824 376.848 230.824 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 379.033C228.679 379.033 228.6 379.114 228.6 379.213C228.6 379.312 228.679 379.392 228.776 379.392H233.224C233.321 379.392 233.4 379.312 233.4 379.213C233.4 379.114 233.321 379.033 233.224 379.033H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 367.167V371.698C230.824 371.797 230.903 371.877 231 371.877C231.097 371.877 231.176 371.797 231.176 371.698V367.167C231.176 367.067 231.097 366.987 231 366.987C230.903 366.987 230.824 367.067 230.824 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 369.253C228.679 369.253 228.6 369.333 228.6 369.432C228.6 369.531 228.679 369.612 228.776 369.612H233.224C233.321 369.612 233.4 369.531 233.4 369.432C233.4 369.333 233.321 369.253 233.224 369.253H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 357.386V361.917C230.824 362.016 230.903 362.097 231 362.097C231.097 362.097 231.176 362.016 231.176 361.917V357.386C231.176 357.287 231.097 357.206 231 357.206C230.903 357.206 230.824 357.287 230.824 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 359.472C228.679 359.472 228.6 359.552 228.6 359.652C228.6 359.751 228.679 359.831 228.776 359.831H233.224C233.321 359.831 233.4 359.751 233.4 359.652C233.4 359.552 233.321 359.472 233.224 359.472H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 347.605V352.137C230.824 352.236 230.903 352.316 231 352.316C231.097 352.316 231.176 352.236 231.176 352.137V347.605C231.176 347.506 231.097 347.426 231 347.426C230.903 347.426 230.824 347.506 230.824 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 349.691C228.679 349.691 228.6 349.772 228.6 349.871C228.6 349.97 228.679 350.05 228.776 350.05H233.224C233.321 350.05 233.4 349.97 233.4 349.871C233.4 349.772 233.321 349.691 233.224 349.691H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 337.825V342.356C230.824 342.455 230.903 342.535 231 342.535C231.097 342.535 231.176 342.455 231.176 342.356V337.825C231.176 337.725 231.097 337.645 231 337.645C230.903 337.645 230.824 337.725 230.824 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 339.911C228.679 339.911 228.6 339.991 228.6 340.09C228.6 340.189 228.679 340.27 228.776 340.27H233.224C233.321 340.27 233.4 340.189 233.4 340.09C233.4 339.991 233.321 339.911 233.224 339.911H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 328.044V332.575C230.824 332.674 230.903 332.755 231 332.755C231.097 332.755 231.176 332.674 231.176 332.575V328.044C231.176 327.945 231.097 327.864 231 327.864C230.903 327.864 230.824 327.945 230.824 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 330.13C228.679 330.13 228.6 330.21 228.6 330.31C228.6 330.409 228.679 330.489 228.776 330.489H233.224C233.321 330.489 233.4 330.409 233.4 330.31C233.4 330.21 233.321 330.13 233.224 330.13H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 318.263V322.795C230.824 322.894 230.903 322.974 231 322.974C231.097 322.974 231.176 322.894 231.176 322.795V318.263C231.176 318.164 231.097 318.084 231 318.084C230.903 318.084 230.824 318.164 230.824 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 320.349C228.679 320.349 228.6 320.43 228.6 320.529C228.6 320.628 228.679 320.708 228.776 320.708H233.224C233.321 320.708 233.4 320.628 233.4 320.529C233.4 320.43 233.321 320.349 233.224 320.349H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 308.483V313.014C230.824 313.113 230.903 313.193 231 313.193C231.097 313.193 231.176 313.113 231.176 313.014V308.483C231.176 308.383 231.097 308.303 231 308.303C230.903 308.303 230.824 308.383 230.824 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 310.569C228.679 310.569 228.6 310.649 228.6 310.748C228.6 310.847 228.679 310.928 228.776 310.928H233.224C233.321 310.928 233.4 310.847 233.4 310.748C233.4 310.649 233.321 310.569 233.224 310.569H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 298.702V303.233C230.824 303.332 230.903 303.413 231 303.413C231.097 303.413 231.176 303.332 231.176 303.233V298.702C231.176 298.603 231.097 298.522 231 298.522C230.903 298.522 230.824 298.603 230.824 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 300.788C228.679 300.788 228.6 300.869 228.6 300.968C228.6 301.067 228.679 301.147 228.776 301.147H233.224C233.321 301.147 233.4 301.067 233.4 300.968C233.4 300.869 233.321 300.788 233.224 300.788H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 288.921V293.453C230.824 293.552 230.903 293.632 231 293.632C231.097 293.632 231.176 293.552 231.176 293.453V288.921C231.176 288.822 231.097 288.742 231 288.742C230.903 288.742 230.824 288.822 230.824 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 291.008C228.679 291.008 228.6 291.088 228.6 291.187C228.6 291.286 228.679 291.367 228.776 291.367H233.224C233.321 291.367 233.4 291.286 233.4 291.187C233.4 291.088 233.321 291.008 233.224 291.008H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 279.14V283.672C230.824 283.771 230.903 283.851 231 283.851C231.097 283.851 231.176 283.771 231.176 283.672V279.14C231.176 279.041 231.097 278.961 231 278.961C230.903 278.961 230.824 279.041 230.824 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 281.227C228.679 281.227 228.6 281.307 228.6 281.406C228.6 281.505 228.679 281.586 228.776 281.586H233.224C233.321 281.586 233.4 281.505 233.4 281.406C233.4 281.307 233.321 281.227 233.224 281.227H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 269.36V273.891C230.824 273.99 230.903 274.071 231 274.071C231.097 274.071 231.176 273.99 231.176 273.891V269.36C231.176 269.261 231.097 269.18 231 269.18C230.903 269.18 230.824 269.261 230.824 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 271.446C228.679 271.446 228.6 271.526 228.6 271.626C228.6 271.725 228.679 271.805 228.776 271.805H233.224C233.321 271.805 233.4 271.725 233.4 271.626C233.4 271.526 233.321 271.446 233.224 271.446H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 259.579V264.111C230.824 264.21 230.903 264.29 231 264.29C231.097 264.29 231.176 264.21 231.176 264.111V259.579C231.176 259.48 231.097 259.4 231 259.4C230.903 259.4 230.824 259.48 230.824 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 261.666C228.679 261.666 228.6 261.746 228.6 261.845C228.6 261.944 228.679 262.025 228.776 262.025H233.224C233.321 262.025 233.4 261.944 233.4 261.845C233.4 261.746 233.321 261.666 233.224 261.666H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 406.289V410.82C240.424 410.92 240.503 411 240.6 411C240.697 411 240.776 410.92 240.776 410.82V406.289C240.776 406.19 240.697 406.11 240.6 406.11C240.503 406.11 240.424 406.19 240.424 406.289Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 408.375C238.279 408.375 238.2 408.456 238.2 408.555C238.2 408.654 238.279 408.734 238.376 408.734H242.824C242.921 408.734 243 408.654 243 408.555C243 408.456 242.921 408.375 242.824 408.375H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 396.508V401.04C240.424 401.139 240.503 401.219 240.6 401.219C240.697 401.219 240.776 401.139 240.776 401.04V396.508C240.776 396.409 240.697 396.329 240.6 396.329C240.503 396.329 240.424 396.409 240.424 396.508Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 398.595C238.279 398.595 238.2 398.675 238.2 398.774C238.2 398.873 238.279 398.954 238.376 398.954H242.824C242.921 398.954 243 398.873 243 398.774C243 398.675 242.921 398.595 242.824 398.595H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 386.728V391.259C240.424 391.358 240.503 391.439 240.6 391.439C240.697 391.439 240.776 391.358 240.776 391.259V386.728C240.776 386.629 240.697 386.548 240.6 386.548C240.503 386.548 240.424 386.629 240.424 386.728Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 388.814C238.279 388.814 238.2 388.894 238.2 388.994C238.2 389.093 238.279 389.173 238.376 389.173H242.824C242.921 389.173 243 389.093 243 388.994C243 388.894 242.921 388.814 242.824 388.814H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 376.947V381.479C240.424 381.578 240.503 381.658 240.6 381.658C240.697 381.658 240.776 381.578 240.776 381.479V376.947C240.776 376.848 240.697 376.768 240.6 376.768C240.503 376.768 240.424 376.848 240.424 376.947Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 379.033C238.279 379.033 238.2 379.114 238.2 379.213C238.2 379.312 238.279 379.392 238.376 379.392H242.824C242.921 379.392 243 379.312 243 379.213C243 379.114 242.921 379.033 242.824 379.033H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 367.167V371.698C240.424 371.797 240.503 371.877 240.6 371.877C240.697 371.877 240.776 371.797 240.776 371.698V367.167C240.776 367.067 240.697 366.987 240.6 366.987C240.503 366.987 240.424 367.067 240.424 367.167Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 369.253C238.279 369.253 238.2 369.333 238.2 369.432C238.2 369.531 238.279 369.612 238.376 369.612H242.824C242.921 369.612 243 369.531 243 369.432C243 369.333 242.921 369.253 242.824 369.253H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 357.386V361.917C240.424 362.016 240.503 362.097 240.6 362.097C240.697 362.097 240.776 362.016 240.776 361.917V357.386C240.776 357.287 240.697 357.206 240.6 357.206C240.503 357.206 240.424 357.287 240.424 357.386Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 359.472C238.279 359.472 238.2 359.552 238.2 359.652C238.2 359.751 238.279 359.831 238.376 359.831H242.824C242.921 359.831 243 359.751 243 359.652C243 359.552 242.921 359.472 242.824 359.472H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 347.605V352.137C240.424 352.236 240.503 352.316 240.6 352.316C240.697 352.316 240.776 352.236 240.776 352.137V347.605C240.776 347.506 240.697 347.426 240.6 347.426C240.503 347.426 240.424 347.506 240.424 347.605Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 349.691C238.279 349.691 238.2 349.772 238.2 349.871C238.2 349.97 238.279 350.05 238.376 350.05H242.824C242.921 350.05 243 349.97 243 349.871C243 349.772 242.921 349.691 242.824 349.691H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 337.825V342.356C240.424 342.455 240.503 342.535 240.6 342.535C240.697 342.535 240.776 342.455 240.776 342.356V337.825C240.776 337.725 240.697 337.645 240.6 337.645C240.503 337.645 240.424 337.725 240.424 337.825Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 339.911C238.279 339.911 238.2 339.991 238.2 340.09C238.2 340.189 238.279 340.27 238.376 340.27H242.824C242.921 340.27 243 340.189 243 340.09C243 339.991 242.921 339.911 242.824 339.911H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 328.044V332.575C240.424 332.674 240.503 332.755 240.6 332.755C240.697 332.755 240.776 332.674 240.776 332.575V328.044C240.776 327.945 240.697 327.864 240.6 327.864C240.503 327.864 240.424 327.945 240.424 328.044Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 330.13C238.279 330.13 238.2 330.21 238.2 330.31C238.2 330.409 238.279 330.489 238.376 330.489H242.824C242.921 330.489 243 330.409 243 330.31C243 330.21 242.921 330.13 242.824 330.13H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 318.263V322.795C240.424 322.894 240.503 322.974 240.6 322.974C240.697 322.974 240.776 322.894 240.776 322.795V318.263C240.776 318.164 240.697 318.084 240.6 318.084C240.503 318.084 240.424 318.164 240.424 318.263Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 320.349C238.279 320.349 238.2 320.43 238.2 320.529C238.2 320.628 238.279 320.708 238.376 320.708H242.824C242.921 320.708 243 320.628 243 320.529C243 320.43 242.921 320.349 242.824 320.349H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 308.483V313.014C240.424 313.113 240.503 313.193 240.6 313.193C240.697 313.193 240.776 313.113 240.776 313.014V308.483C240.776 308.383 240.697 308.303 240.6 308.303C240.503 308.303 240.424 308.383 240.424 308.483Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 310.569C238.279 310.569 238.2 310.649 238.2 310.748C238.2 310.847 238.279 310.928 238.376 310.928H242.824C242.921 310.928 243 310.847 243 310.748C243 310.649 242.921 310.569 242.824 310.569H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 298.702V303.233C240.424 303.332 240.503 303.413 240.6 303.413C240.697 303.413 240.776 303.332 240.776 303.233V298.702C240.776 298.603 240.697 298.522 240.6 298.522C240.503 298.522 240.424 298.603 240.424 298.702Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 300.788C238.279 300.788 238.2 300.869 238.2 300.968C238.2 301.067 238.279 301.147 238.376 301.147H242.824C242.921 301.147 243 301.067 243 300.968C243 300.869 242.921 300.788 242.824 300.788H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 288.921V293.453C240.424 293.552 240.503 293.632 240.6 293.632C240.697 293.632 240.776 293.552 240.776 293.453V288.921C240.776 288.822 240.697 288.742 240.6 288.742C240.503 288.742 240.424 288.822 240.424 288.921Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 291.008C238.279 291.008 238.2 291.088 238.2 291.187C238.2 291.286 238.279 291.367 238.376 291.367H242.824C242.921 291.367 243 291.286 243 291.187C243 291.088 242.921 291.008 242.824 291.008H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 279.14V283.672C240.424 283.771 240.503 283.851 240.6 283.851C240.697 283.851 240.776 283.771 240.776 283.672V279.14C240.776 279.041 240.697 278.961 240.6 278.961C240.503 278.961 240.424 279.041 240.424 279.14Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 281.227C238.279 281.227 238.2 281.307 238.2 281.406C238.2 281.505 238.279 281.586 238.376 281.586H242.824C242.921 281.586 243 281.505 243 281.406C243 281.307 242.921 281.227 242.824 281.227H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 269.36V273.891C240.424 273.99 240.503 274.071 240.6 274.071C240.697 274.071 240.776 273.99 240.776 273.891V269.36C240.776 269.261 240.697 269.18 240.6 269.18C240.503 269.18 240.424 269.261 240.424 269.36Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 271.446C238.279 271.446 238.2 271.526 238.2 271.626C238.2 271.725 238.279 271.805 238.376 271.805H242.824C242.921 271.805 243 271.725 243 271.626C243 271.526 242.921 271.446 242.824 271.446H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 259.579V264.111C240.424 264.21 240.503 264.29 240.6 264.29C240.697 264.29 240.776 264.21 240.776 264.111V259.579C240.776 259.48 240.697 259.4 240.6 259.4C240.503 259.4 240.424 259.48 240.424 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 261.666C238.279 261.666 238.2 261.746 238.2 261.845C238.2 261.944 238.279 262.025 238.376 262.025H242.824C242.921 262.025 243 261.944 243 261.845C243 261.746 242.921 261.666 242.824 261.666H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 259.579V264.111C221.224 264.21 221.303 264.29 221.4 264.29C221.497 264.29 221.576 264.21 221.576 264.111V259.579C221.576 259.48 221.497 259.4 221.4 259.4C221.303 259.4 221.224 259.48 221.224 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 261.666C219.079 261.666 219 261.746 219 261.845C219 261.944 219.079 262.025 219.176 262.025H223.624C223.721 262.025 223.8 261.944 223.8 261.845C223.8 261.746 223.721 261.666 223.624 261.666H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 249.799V254.33C221.224 254.429 221.303 254.509 221.4 254.509C221.497 254.509 221.576 254.429 221.576 254.33V249.799C221.576 249.699 221.497 249.619 221.4 249.619C221.303 249.619 221.224 249.699 221.224 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 251.885C219.079 251.885 219 251.965 219 252.064C219 252.163 219.079 252.244 219.176 252.244H223.624C223.721 252.244 223.8 252.163 223.8 252.064C223.8 251.965 223.721 251.885 223.624 251.885H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 240.018V244.549C221.224 244.648 221.303 244.729 221.4 244.729C221.497 244.729 221.576 244.648 221.576 244.549V240.018C221.576 239.919 221.497 239.838 221.4 239.838C221.303 239.838 221.224 239.919 221.224 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 242.104C219.079 242.104 219 242.184 219 242.284C219 242.383 219.079 242.463 219.176 242.463H223.624C223.721 242.463 223.8 242.383 223.8 242.284C223.8 242.184 223.721 242.104 223.624 242.104H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 230.237V234.769C221.224 234.868 221.303 234.948 221.4 234.948C221.497 234.948 221.576 234.868 221.576 234.769V230.237C221.576 230.138 221.497 230.058 221.4 230.058C221.303 230.058 221.224 230.138 221.224 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 232.323C219.079 232.323 219 232.404 219 232.503C219 232.602 219.079 232.682 219.176 232.682H223.624C223.721 232.682 223.8 232.602 223.8 232.503C223.8 232.404 223.721 232.323 223.624 232.323H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 220.457V224.988C221.224 225.087 221.303 225.167 221.4 225.167C221.497 225.167 221.576 225.087 221.576 224.988V220.457C221.576 220.357 221.497 220.277 221.4 220.277C221.303 220.277 221.224 220.357 221.224 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 222.543C219.079 222.543 219 222.623 219 222.722C219 222.821 219.079 222.902 219.176 222.902H223.624C223.721 222.902 223.8 222.821 223.8 222.722C223.8 222.623 223.721 222.543 223.624 222.543H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 210.676V215.207C221.224 215.306 221.303 215.387 221.4 215.387C221.497 215.387 221.576 215.306 221.576 215.207V210.676C221.576 210.577 221.497 210.496 221.4 210.496C221.303 210.496 221.224 210.577 221.224 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 212.762C219.079 212.762 219 212.842 219 212.942C219 213.041 219.079 213.121 219.176 213.121H223.624C223.721 213.121 223.8 213.041 223.8 212.942C223.8 212.842 223.721 212.762 223.624 212.762H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 200.895V205.427C221.224 205.526 221.303 205.606 221.4 205.606C221.497 205.606 221.576 205.526 221.576 205.427V200.895C221.576 200.796 221.497 200.716 221.4 200.716C221.303 200.716 221.224 200.796 221.224 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 202.981C219.079 202.981 219 203.062 219 203.161C219 203.26 219.079 203.34 219.176 203.34H223.624C223.721 203.34 223.8 203.26 223.8 203.161C223.8 203.062 223.721 202.981 223.624 202.981H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 191.115V195.646C221.224 195.745 221.303 195.825 221.4 195.825C221.497 195.825 221.576 195.745 221.576 195.646V191.115C221.576 191.016 221.497 190.935 221.4 190.935C221.303 190.935 221.224 191.016 221.224 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 193.201C219.079 193.201 219 193.281 219 193.38C219 193.479 219.079 193.56 219.176 193.56H223.624C223.721 193.56 223.8 193.479 223.8 193.38C223.8 193.281 223.721 193.201 223.624 193.201H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 181.334V185.865C221.224 185.964 221.303 186.045 221.4 186.045C221.497 186.045 221.576 185.964 221.576 185.865V181.334C221.576 181.235 221.497 181.154 221.4 181.154C221.303 181.154 221.224 181.235 221.224 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 183.42C219.079 183.42 219 183.5 219 183.6C219 183.699 219.079 183.779 219.176 183.779H223.624C223.721 183.779 223.8 183.699 223.8 183.6C223.8 183.5 223.721 183.42 223.624 183.42H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 171.553L221.224 176.085C221.224 176.184 221.303 176.264 221.4 176.264C221.497 176.264 221.576 176.184 221.576 176.085L221.576 171.553C221.576 171.454 221.497 171.374 221.4 171.374C221.303 171.374 221.224 171.454 221.224 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 173.639C219.079 173.639 219 173.72 219 173.819C219 173.918 219.079 173.998 219.176 173.998H223.624C223.721 173.998 223.8 173.918 223.8 173.819C223.8 173.72 223.721 173.639 223.624 173.639H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 161.773V166.304C221.224 166.403 221.303 166.483 221.4 166.483C221.497 166.483 221.576 166.403 221.576 166.304V161.773C221.576 161.674 221.497 161.593 221.4 161.593C221.303 161.593 221.224 161.674 221.224 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 163.859C219.079 163.859 219 163.939 219 164.038C219 164.137 219.079 164.218 219.176 164.218H223.624C223.721 164.218 223.8 164.137 223.8 164.038C223.8 163.939 223.721 163.859 223.624 163.859H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 151.992V156.523C221.224 156.622 221.303 156.703 221.4 156.703C221.497 156.703 221.576 156.622 221.576 156.523V151.992C221.576 151.893 221.497 151.812 221.4 151.812C221.303 151.812 221.224 151.893 221.224 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 154.078C219.079 154.078 219 154.158 219 154.258C219 154.357 219.079 154.437 219.176 154.437H223.624C223.721 154.437 223.8 154.357 223.8 154.258C223.8 154.158 223.721 154.078 223.624 154.078H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 142.211V146.743C221.224 146.842 221.303 146.922 221.4 146.922C221.497 146.922 221.576 146.842 221.576 146.743V142.211C221.576 142.112 221.497 142.032 221.4 142.032C221.303 142.032 221.224 142.112 221.224 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 144.297C219.079 144.297 219 144.378 219 144.477C219 144.576 219.079 144.657 219.176 144.657H223.624C223.721 144.657 223.8 144.576 223.8 144.477C223.8 144.378 223.721 144.297 223.624 144.297H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 132.431V136.962C221.224 137.061 221.303 137.141 221.4 137.141C221.497 137.141 221.576 137.061 221.576 136.962V132.431C221.576 132.331 221.497 132.251 221.4 132.251C221.303 132.251 221.224 132.331 221.224 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 134.517C219.079 134.517 219 134.597 219 134.696C219 134.795 219.079 134.876 219.176 134.876H223.624C223.721 134.876 223.8 134.795 223.8 134.696C223.8 134.597 223.721 134.517 223.624 134.517H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 122.65V127.181C221.224 127.28 221.303 127.361 221.4 127.361C221.497 127.361 221.576 127.28 221.576 127.181V122.65C221.576 122.551 221.497 122.47 221.4 122.47C221.303 122.47 221.224 122.551 221.224 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 124.736C219.079 124.736 219 124.817 219 124.916C219 125.015 219.079 125.095 219.176 125.095H223.624C223.721 125.095 223.8 125.015 223.8 124.916C223.8 124.817 223.721 124.736 223.624 124.736H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 112.869V117.401C221.224 117.5 221.303 117.58 221.4 117.58C221.497 117.58 221.576 117.5 221.576 117.401V112.869C221.576 112.77 221.497 112.69 221.4 112.69C221.303 112.69 221.224 112.77 221.224 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 114.956C219.079 114.956 219 115.036 219 115.135C219 115.234 219.079 115.315 219.176 115.315H223.624C223.721 115.315 223.8 115.234 223.8 115.135C223.8 115.036 223.721 114.956 223.624 114.956H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 103.089V107.62C221.224 107.719 221.303 107.799 221.4 107.799C221.497 107.799 221.576 107.719 221.576 107.62V103.089C221.576 102.989 221.497 102.909 221.4 102.909C221.303 102.909 221.224 102.989 221.224 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 105.175C219.079 105.175 219 105.255 219 105.354C219 105.453 219.079 105.534 219.176 105.534H223.624C223.721 105.534 223.8 105.453 223.8 105.354C223.8 105.255 223.721 105.175 223.624 105.175H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M221.224 93.3079V97.8392C221.224 97.9384 221.303 98.0187 221.4 98.0187C221.497 98.0187 221.576 97.9384 221.576 97.8392V93.3079C221.576 93.2088 221.497 93.1284 221.4 93.1284C221.303 93.1284 221.224 93.2088 221.224 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M219.176 95.3942C219.079 95.3942 219 95.4746 219 95.5737C219 95.6728 219.079 95.7532 219.176 95.7532H223.624C223.721 95.7532 223.8 95.6728 223.8 95.5737C223.8 95.4746 223.721 95.3942 223.624 95.3942H219.176Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 259.579V264.111C230.824 264.21 230.903 264.29 231 264.29C231.097 264.29 231.176 264.21 231.176 264.111V259.579C231.176 259.48 231.097 259.4 231 259.4C230.903 259.4 230.824 259.48 230.824 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 261.666C228.679 261.666 228.6 261.746 228.6 261.845C228.6 261.944 228.679 262.025 228.776 262.025H233.224C233.321 262.025 233.4 261.944 233.4 261.845C233.4 261.746 233.321 261.666 233.224 261.666H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 249.799V254.33C230.824 254.429 230.903 254.509 231 254.509C231.097 254.509 231.176 254.429 231.176 254.33V249.799C231.176 249.699 231.097 249.619 231 249.619C230.903 249.619 230.824 249.699 230.824 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 251.885C228.679 251.885 228.6 251.965 228.6 252.064C228.6 252.163 228.679 252.244 228.776 252.244H233.224C233.321 252.244 233.4 252.163 233.4 252.064C233.4 251.965 233.321 251.885 233.224 251.885H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 240.018V244.549C230.824 244.648 230.903 244.729 231 244.729C231.097 244.729 231.176 244.648 231.176 244.549V240.018C231.176 239.919 231.097 239.838 231 239.838C230.903 239.838 230.824 239.919 230.824 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 242.104C228.679 242.104 228.6 242.184 228.6 242.284C228.6 242.383 228.679 242.463 228.776 242.463H233.224C233.321 242.463 233.4 242.383 233.4 242.284C233.4 242.184 233.321 242.104 233.224 242.104H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 230.237V234.769C230.824 234.868 230.903 234.948 231 234.948C231.097 234.948 231.176 234.868 231.176 234.769V230.237C231.176 230.138 231.097 230.058 231 230.058C230.903 230.058 230.824 230.138 230.824 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 232.323C228.679 232.323 228.6 232.404 228.6 232.503C228.6 232.602 228.679 232.682 228.776 232.682H233.224C233.321 232.682 233.4 232.602 233.4 232.503C233.4 232.404 233.321 232.323 233.224 232.323H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 220.457V224.988C230.824 225.087 230.903 225.167 231 225.167C231.097 225.167 231.176 225.087 231.176 224.988V220.457C231.176 220.357 231.097 220.277 231 220.277C230.903 220.277 230.824 220.357 230.824 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 222.543C228.679 222.543 228.6 222.623 228.6 222.722C228.6 222.821 228.679 222.902 228.776 222.902H233.224C233.321 222.902 233.4 222.821 233.4 222.722C233.4 222.623 233.321 222.543 233.224 222.543H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 210.676V215.207C230.824 215.306 230.903 215.387 231 215.387C231.097 215.387 231.176 215.306 231.176 215.207V210.676C231.176 210.577 231.097 210.496 231 210.496C230.903 210.496 230.824 210.577 230.824 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 212.762C228.679 212.762 228.6 212.842 228.6 212.942C228.6 213.041 228.679 213.121 228.776 213.121H233.224C233.321 213.121 233.4 213.041 233.4 212.942C233.4 212.842 233.321 212.762 233.224 212.762H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 200.895V205.427C230.824 205.526 230.903 205.606 231 205.606C231.097 205.606 231.176 205.526 231.176 205.427V200.895C231.176 200.796 231.097 200.716 231 200.716C230.903 200.716 230.824 200.796 230.824 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 202.981C228.679 202.981 228.6 203.062 228.6 203.161C228.6 203.26 228.679 203.34 228.776 203.34H233.224C233.321 203.34 233.4 203.26 233.4 203.161C233.4 203.062 233.321 202.981 233.224 202.981H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 191.115V195.646C230.824 195.745 230.903 195.825 231 195.825C231.097 195.825 231.176 195.745 231.176 195.646V191.115C231.176 191.016 231.097 190.935 231 190.935C230.903 190.935 230.824 191.016 230.824 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 193.201C228.679 193.201 228.6 193.281 228.6 193.38C228.6 193.479 228.679 193.56 228.776 193.56H233.224C233.321 193.56 233.4 193.479 233.4 193.38C233.4 193.281 233.321 193.201 233.224 193.201H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 181.334V185.865C230.824 185.964 230.903 186.045 231 186.045C231.097 186.045 231.176 185.964 231.176 185.865V181.334C231.176 181.235 231.097 181.154 231 181.154C230.903 181.154 230.824 181.235 230.824 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 183.42C228.679 183.42 228.6 183.5 228.6 183.6C228.6 183.699 228.679 183.779 228.776 183.779H233.224C233.321 183.779 233.4 183.699 233.4 183.6C233.4 183.5 233.321 183.42 233.224 183.42H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 171.553V176.085C230.824 176.184 230.903 176.264 231 176.264C231.097 176.264 231.176 176.184 231.176 176.085V171.553C231.176 171.454 231.097 171.374 231 171.374C230.903 171.374 230.824 171.454 230.824 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 173.639C228.679 173.639 228.6 173.72 228.6 173.819C228.6 173.918 228.679 173.998 228.776 173.998H233.224C233.321 173.998 233.4 173.918 233.4 173.819C233.4 173.72 233.321 173.639 233.224 173.639H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 161.773L230.824 166.304C230.824 166.403 230.903 166.483 231 166.483C231.097 166.483 231.176 166.403 231.176 166.304L231.176 161.773C231.176 161.674 231.097 161.593 231 161.593C230.903 161.593 230.824 161.674 230.824 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 163.859C228.679 163.859 228.6 163.939 228.6 164.038C228.6 164.137 228.679 164.218 228.776 164.218H233.224C233.321 164.218 233.4 164.137 233.4 164.038C233.4 163.939 233.321 163.859 233.224 163.859H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 151.992V156.523C230.824 156.622 230.903 156.703 231 156.703C231.097 156.703 231.176 156.622 231.176 156.523V151.992C231.176 151.893 231.097 151.812 231 151.812C230.903 151.812 230.824 151.893 230.824 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 154.078C228.679 154.078 228.6 154.158 228.6 154.258C228.6 154.357 228.679 154.437 228.776 154.437H233.224C233.321 154.437 233.4 154.357 233.4 154.258C233.4 154.158 233.321 154.078 233.224 154.078H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 142.211V146.743C230.824 146.842 230.903 146.922 231 146.922C231.097 146.922 231.176 146.842 231.176 146.743V142.211C231.176 142.112 231.097 142.032 231 142.032C230.903 142.032 230.824 142.112 230.824 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 144.297C228.679 144.297 228.6 144.378 228.6 144.477C228.6 144.576 228.679 144.657 228.776 144.657H233.224C233.321 144.657 233.4 144.576 233.4 144.477C233.4 144.378 233.321 144.297 233.224 144.297H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 132.431V136.962C230.824 137.061 230.903 137.141 231 137.141C231.097 137.141 231.176 137.061 231.176 136.962V132.431C231.176 132.331 231.097 132.251 231 132.251C230.903 132.251 230.824 132.331 230.824 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 134.517C228.679 134.517 228.6 134.597 228.6 134.696C228.6 134.795 228.679 134.876 228.776 134.876H233.224C233.321 134.876 233.4 134.795 233.4 134.696C233.4 134.597 233.321 134.517 233.224 134.517H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 122.65V127.181C230.824 127.28 230.903 127.361 231 127.361C231.097 127.361 231.176 127.28 231.176 127.181V122.65C231.176 122.551 231.097 122.47 231 122.47C230.903 122.47 230.824 122.551 230.824 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 124.736C228.679 124.736 228.6 124.817 228.6 124.916C228.6 125.015 228.679 125.095 228.776 125.095H233.224C233.321 125.095 233.4 125.015 233.4 124.916C233.4 124.817 233.321 124.736 233.224 124.736H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 112.869V117.401C230.824 117.5 230.903 117.58 231 117.58C231.097 117.58 231.176 117.5 231.176 117.401V112.869C231.176 112.77 231.097 112.69 231 112.69C230.903 112.69 230.824 112.77 230.824 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 114.956C228.679 114.956 228.6 115.036 228.6 115.135C228.6 115.234 228.679 115.315 228.776 115.315H233.224C233.321 115.315 233.4 115.234 233.4 115.135C233.4 115.036 233.321 114.956 233.224 114.956H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 103.089V107.62C230.824 107.719 230.903 107.799 231 107.799C231.097 107.799 231.176 107.719 231.176 107.62V103.089C231.176 102.989 231.097 102.909 231 102.909C230.903 102.909 230.824 102.989 230.824 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 105.175C228.679 105.175 228.6 105.255 228.6 105.354C228.6 105.453 228.679 105.534 228.776 105.534H233.224C233.321 105.534 233.4 105.453 233.4 105.354C233.4 105.255 233.321 105.175 233.224 105.175H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M230.824 93.3079V97.8392C230.824 97.9384 230.903 98.0187 231 98.0187C231.097 98.0187 231.176 97.9384 231.176 97.8392V93.3079C231.176 93.2088 231.097 93.1284 231 93.1284C230.903 93.1284 230.824 93.2088 230.824 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M228.776 95.3942C228.679 95.3942 228.6 95.4746 228.6 95.5737C228.6 95.6728 228.679 95.7532 228.776 95.7532H233.224C233.321 95.7532 233.4 95.6728 233.4 95.5737C233.4 95.4746 233.321 95.3942 233.224 95.3942H228.776Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 259.579V264.111C240.424 264.21 240.503 264.29 240.6 264.29C240.697 264.29 240.776 264.21 240.776 264.111V259.579C240.776 259.48 240.697 259.4 240.6 259.4C240.503 259.4 240.424 259.48 240.424 259.579Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 261.666C238.279 261.666 238.2 261.746 238.2 261.845C238.2 261.944 238.279 262.025 238.376 262.025H242.824C242.921 262.025 243 261.944 243 261.845C243 261.746 242.921 261.666 242.824 261.666H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 249.799V254.33C240.424 254.429 240.503 254.509 240.6 254.509C240.697 254.509 240.776 254.429 240.776 254.33V249.799C240.776 249.699 240.697 249.619 240.6 249.619C240.503 249.619 240.424 249.699 240.424 249.799Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 251.885C238.279 251.885 238.2 251.965 238.2 252.064C238.2 252.163 238.279 252.244 238.376 252.244H242.824C242.921 252.244 243 252.163 243 252.064C243 251.965 242.921 251.885 242.824 251.885H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 240.018V244.549C240.424 244.648 240.503 244.729 240.6 244.729C240.697 244.729 240.776 244.648 240.776 244.549V240.018C240.776 239.919 240.697 239.838 240.6 239.838C240.503 239.838 240.424 239.919 240.424 240.018Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 242.104C238.279 242.104 238.2 242.184 238.2 242.284C238.2 242.383 238.279 242.463 238.376 242.463H242.824C242.921 242.463 243 242.383 243 242.284C243 242.184 242.921 242.104 242.824 242.104H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 230.237V234.769C240.424 234.868 240.503 234.948 240.6 234.948C240.697 234.948 240.776 234.868 240.776 234.769V230.237C240.776 230.138 240.697 230.058 240.6 230.058C240.503 230.058 240.424 230.138 240.424 230.237Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 232.323C238.279 232.323 238.2 232.404 238.2 232.503C238.2 232.602 238.279 232.682 238.376 232.682H242.824C242.921 232.682 243 232.602 243 232.503C243 232.404 242.921 232.323 242.824 232.323H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 220.457V224.988C240.424 225.087 240.503 225.167 240.6 225.167C240.697 225.167 240.776 225.087 240.776 224.988V220.457C240.776 220.357 240.697 220.277 240.6 220.277C240.503 220.277 240.424 220.357 240.424 220.457Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 222.543C238.279 222.543 238.2 222.623 238.2 222.722C238.2 222.821 238.279 222.902 238.376 222.902H242.824C242.921 222.902 243 222.821 243 222.722C243 222.623 242.921 222.543 242.824 222.543H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 210.676V215.207C240.424 215.306 240.503 215.387 240.6 215.387C240.697 215.387 240.776 215.306 240.776 215.207V210.676C240.776 210.577 240.697 210.496 240.6 210.496C240.503 210.496 240.424 210.577 240.424 210.676Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 212.762C238.279 212.762 238.2 212.842 238.2 212.942C238.2 213.041 238.279 213.121 238.376 213.121H242.824C242.921 213.121 243 213.041 243 212.942C243 212.842 242.921 212.762 242.824 212.762H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 200.895V205.427C240.424 205.526 240.503 205.606 240.6 205.606C240.697 205.606 240.776 205.526 240.776 205.427V200.895C240.776 200.796 240.697 200.716 240.6 200.716C240.503 200.716 240.424 200.796 240.424 200.895Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 202.981C238.279 202.981 238.2 203.062 238.2 203.161C238.2 203.26 238.279 203.34 238.376 203.34H242.824C242.921 203.34 243 203.26 243 203.161C243 203.062 242.921 202.981 242.824 202.981H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 191.115V195.646C240.424 195.745 240.503 195.825 240.6 195.825C240.697 195.825 240.776 195.745 240.776 195.646V191.115C240.776 191.016 240.697 190.935 240.6 190.935C240.503 190.935 240.424 191.016 240.424 191.115Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 193.201C238.279 193.201 238.2 193.281 238.2 193.38C238.2 193.479 238.279 193.56 238.376 193.56H242.824C242.921 193.56 243 193.479 243 193.38C243 193.281 242.921 193.201 242.824 193.201H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 181.334V185.865C240.424 185.964 240.503 186.045 240.6 186.045C240.697 186.045 240.776 185.964 240.776 185.865V181.334C240.776 181.235 240.697 181.154 240.6 181.154C240.503 181.154 240.424 181.235 240.424 181.334Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 183.42C238.279 183.42 238.2 183.5 238.2 183.6C238.2 183.699 238.279 183.779 238.376 183.779H242.824C242.921 183.779 243 183.699 243 183.6C243 183.5 242.921 183.42 242.824 183.42H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 171.553V176.085C240.424 176.184 240.503 176.264 240.6 176.264C240.697 176.264 240.776 176.184 240.776 176.085V171.553C240.776 171.454 240.697 171.374 240.6 171.374C240.503 171.374 240.424 171.454 240.424 171.553Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 173.639C238.279 173.639 238.2 173.72 238.2 173.819C238.2 173.918 238.279 173.998 238.376 173.998H242.824C242.921 173.998 243 173.918 243 173.819C243 173.72 242.921 173.639 242.824 173.639H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 161.773V166.304C240.424 166.403 240.503 166.483 240.6 166.483C240.697 166.483 240.776 166.403 240.776 166.304V161.773C240.776 161.674 240.697 161.593 240.6 161.593C240.503 161.593 240.424 161.674 240.424 161.773Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 163.859C238.279 163.859 238.2 163.939 238.2 164.038C238.2 164.137 238.279 164.218 238.376 164.218H242.824C242.921 164.218 243 164.137 243 164.038C243 163.939 242.921 163.859 242.824 163.859H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 151.992V156.523C240.424 156.622 240.503 156.703 240.6 156.703C240.697 156.703 240.776 156.622 240.776 156.523V151.992C240.776 151.893 240.697 151.812 240.6 151.812C240.503 151.812 240.424 151.893 240.424 151.992Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 154.078C238.279 154.078 238.2 154.158 238.2 154.258C238.2 154.357 238.279 154.437 238.376 154.437H242.824C242.921 154.437 243 154.357 243 154.258C243 154.158 242.921 154.078 242.824 154.078H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 142.211V146.743C240.424 146.842 240.503 146.922 240.6 146.922C240.697 146.922 240.776 146.842 240.776 146.743V142.211C240.776 142.112 240.697 142.032 240.6 142.032C240.503 142.032 240.424 142.112 240.424 142.211Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 144.297C238.279 144.297 238.2 144.378 238.2 144.477C238.2 144.576 238.279 144.657 238.376 144.657H242.824C242.921 144.657 243 144.576 243 144.477C243 144.378 242.921 144.297 242.824 144.297H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 132.431V136.962C240.424 137.061 240.503 137.141 240.6 137.141C240.697 137.141 240.776 137.061 240.776 136.962V132.431C240.776 132.331 240.697 132.251 240.6 132.251C240.503 132.251 240.424 132.331 240.424 132.431Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 134.517C238.279 134.517 238.2 134.597 238.2 134.696C238.2 134.795 238.279 134.876 238.376 134.876H242.824C242.921 134.876 243 134.795 243 134.696C243 134.597 242.921 134.517 242.824 134.517H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 122.65V127.181C240.424 127.28 240.503 127.361 240.6 127.361C240.697 127.361 240.776 127.28 240.776 127.181V122.65C240.776 122.551 240.697 122.47 240.6 122.47C240.503 122.47 240.424 122.551 240.424 122.65Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 124.736C238.279 124.736 238.2 124.817 238.2 124.916C238.2 125.015 238.279 125.095 238.376 125.095H242.824C242.921 125.095 243 125.015 243 124.916C243 124.817 242.921 124.736 242.824 124.736H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 112.869V117.401C240.424 117.5 240.503 117.58 240.6 117.58C240.697 117.58 240.776 117.5 240.776 117.401V112.869C240.776 112.77 240.697 112.69 240.6 112.69C240.503 112.69 240.424 112.77 240.424 112.869Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 114.956C238.279 114.956 238.2 115.036 238.2 115.135C238.2 115.234 238.279 115.315 238.376 115.315H242.824C242.921 115.315 243 115.234 243 115.135C243 115.036 242.921 114.956 242.824 114.956H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 103.089V107.62C240.424 107.719 240.503 107.799 240.6 107.799C240.697 107.799 240.776 107.719 240.776 107.62V103.089C240.776 102.989 240.697 102.909 240.6 102.909C240.503 102.909 240.424 102.989 240.424 103.089Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 105.175C238.279 105.175 238.2 105.255 238.2 105.354C238.2 105.453 238.279 105.534 238.376 105.534H242.824C242.921 105.534 243 105.453 243 105.354C243 105.255 242.921 105.175 242.824 105.175H238.376Z"
        fill={colorConfig.grill}
      />
      <path
        d="M240.424 93.3079V97.8392C240.424 97.9384 240.503 98.0187 240.6 98.0187C240.697 98.0187 240.776 97.9384 240.776 97.8392V93.3079C240.776 93.2088 240.697 93.1284 240.6 93.1284C240.503 93.1284 240.424 93.2088 240.424 93.3079Z"
        fill={colorConfig.grill}
      />
      <path
        d="M238.376 95.3942C238.279 95.3942 238.2 95.4746 238.2 95.5737C238.2 95.6728 238.279 95.7532 238.376 95.7532H242.824C242.921 95.7532 243 95.6728 243 95.5737C243 95.4746 242.921 95.3942 242.824 95.3942H238.376Z"
        fill={colorConfig.grill}
      />
    </svg>
    </TooltipProvider>
  );
};

export { OpenDCDH2 };
