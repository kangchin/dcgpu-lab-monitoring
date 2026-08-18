import React, { Fragment } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";

interface TempSensorProps extends React.HTMLAttributes<SVGCircleElement> {
  theme?: string;
  datahall: string;
  location: string;
  cx: number;
  cy: number;
  temperature: number | null | undefined;
}
const TempSensor = ({
  theme,
  cx,
  cy,
  datahall,
  location,
  temperature,
}: TempSensorProps) => {
  const router = useRouter();
  return (
    <Fragment>
      <Tooltip>
        <TooltipTrigger asChild>
          <circle
            cx={cx}
            cy={cy}
            r="10"
            opacity={theme == "dark" ? 0.6 : 1}
            className={
              temperature == null
                ? "fill-gray-200 cursor-pointer"
                : temperature < 20
                  ? "fill-sky-400 cursor-pointer"
                  : temperature <= 40
                    ? "fill-emerald-400 cursor-pointer"
                    : "fill-red-400 cursor-pointer"
            }
            onClick={() =>
              router.push(`/opendc/${datahall}/temperature/${location}`)
            }
          />
        </TooltipTrigger>
        <TooltipContent className="dark:bg-secondary-dark dark:border-none dark:text-white bg-white border text-black">
          <div className="flex flex-col">
            <span>{temperature ? temperature.toFixed(1) + "°C" : "- -°C"}</span>
            <span className="text-xs text-gray-500 mt-1">Location: {location}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </Fragment>
  );
};

export { TempSensor };
