"use client";
import axios from "axios";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { Server } from "@/components/server";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";

//CONSTANTS
const chartColors = ["#a78bfa", "#f472b6", "#00A6F4", "#9AE600"];

//INTERFACES
interface ClientPowerRackProps {
  rack: string;
  datahall: string;
  site: string;
}
type DateRange = "24h" | "7d" | "1mnth";
type GroupedPower = {
  created: string;
  [location: string]: number | string;
};

export default function ClientPowerRack({
  rack,
  datahall,
  site,
}: ClientPowerRackProps) {
  const { theme } = useTheme();

  const [currPower, setCurrPower] = useState<any[]>([]);
  const [allPower, setAllPower] = useState<any[]>([]);
  const [filteredPower, setFilteredPower] = useState<any[]>([]);
  const [currPowerLoading, setCurrPowerLoading] = useState<boolean>(true);
  const [allPowerLoading, setAllPowerLoading] = useState<boolean>(true);
  const [systems, setSystems] = useState<any[]>([]);
  const [systemsLoading, setSystemsLoading] = useState<boolean>(true);

  //CHARTS STATES
  const [chartConfig, setChartConfig] = useState<ChartConfig>({});
  const [selectedPowerRange, setSelectedPowerRange] =
    useState<DateRange>("24h");

  // FUNCTIONS
  const getCurrPower = async () => {
    try {
      const response = await axios.get(
        `/api/power/latest?site=${site}&location=${rack}`
      );
      if (response && response.status === 200) {
        setCurrPower(response.data || []);
      } else {
        console.error("Failed to fetch data");
      }
      setCurrPowerLoading(false);
    } catch (e) {
      console.log(e);
    }
  };

  const getAllPower = async (dateRange: DateRange) => {
    try {
      const response = await axios.get(
        `/api/power?site=${site}&location=${rack}&timeline=${dateRange}`
      );
      if (response && response.status === 200) {
        setAllPower(response.data || []);
      } else {
        console.error("Failed to fetch data");
      }
      setAllPowerLoading(false);
    } catch (e) {
      console.log(e);
    }
  };

  const filterPowerData = () => {
    const grouped = allPower.reduce<GroupedPower[]>((acc, curr) => {
      const { created, location, reading } = curr;

      let group = acc.find((item) => item.created === created);

      if (!group) {
        group = { created };
        acc.push(group);
      }

      group[location] = reading;

      return acc;
    }, []);

    if (grouped.length > 0) {
      setFilteredPower(grouped);
    }
  };

  const updateChartConfig = () => {
    if (Object.keys(chartConfig).length === 0) {
      currPower.forEach((power) => {
        const location = power.location;
        if (!chartConfig[location]) {
          chartConfig[location] = {
            label: location,
          };
        }
      });
      setChartConfig(chartConfig);
    }
  };

  const getSystems = async () => {
    try {
      const response = await axios.get(
        `/api/systems?site=${site}&location=${rack}`
      );
      if (response && response.status === 200) {
        setSystems(response.data || []);
      } else {
        setSystems([]);
      }
      setSystemsLoading(false);
    } catch (e) {
      setSystems([]);
      setSystemsLoading(false);
    }
  };

  //EFFECTS
  useEffect(() => {
    const fetchCurrData = async () => {
      getCurrPower();
      getAllPower(selectedPowerRange);
    };
    fetchCurrData();
    const intervalId = setInterval(fetchCurrData, 60000);
    return () => clearInterval(intervalId);
  }, [selectedPowerRange, setSelectedPowerRange]);

  useEffect(() => {
    if (allPower.length > 0) {
      filterPowerData();
    }
  }, [allPower, setAllPower]);

  useEffect(() => {
    if (currPower.length > 0 && Object.keys(chartConfig).length === 0) {
      updateChartConfig();
    }
  }, [currPower, setCurrPower]);

  useEffect(() => {
    getSystems();
  }, [site, rack]);

  return (
    <>
      <p className="flex text-xl font-bold text-left pb-3">
        {datahall.toUpperCase()} - {rack.toUpperCase()}
      </p>
      <div className="flex flex-row space-x-3 mb-3">
        <Card className="w-96 min-h-64">
          <CardHeader className="text-left">
            <CardTitle>Systems</CardTitle>
            <CardDescription>Systems in this rack</CardDescription>
            <div className="pt-4 pb-0 w-full h-full">
              {systemsLoading ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : systems.length > 0 ? (
                <ul className="list-disc pl-5">
                  {systems.map((system, idx) => (
                    <li key={idx} className="text-sm font-light">
                      <a
                        href={`https://conductor.amd.com/system/management?page=0&pageSize=25&filter=${encodeURIComponent(system.system)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {system.system}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">No systems found</div>
              )}
            </div>
          </CardHeader>
        </Card>
        {currPowerLoading ? (
          <Card className="w-96 min-h-64 relative overflow-hidden">
            <div className="absolute inset-0 h-full w-full -translate-x-full animate-[shimmer_2s_infinite] overflow-hidden bg-gradient-to-r from-transparent via-slate-200/30 to-transparent dark:via-slate-200/10" />
          </Card>
        ) : currPower.length > 0 ? (
          currPower.map((power, index) => (
            <Card key={index}>
              <CardHeader className="text-left">
                <CardTitle>Power Health</CardTitle>
                <CardDescription>
                  {"Last checked " + formatDate(power.created)}
                </CardDescription>
                <div className="pt-4 pb-0 w-full h-full flex items-center space-x-5">
                  <Server reading={power.reading} />
                  <div className="text-slate-500 dark:text-slate-400">
                    <p
                      className={cn(
                        "text-4xl font-extrabold mb-4",
                        power.reading <= 1000
                          ? "text-green-500"
                          : power.reading > 1000 && power.reading <= 4000
                            ? "text-yellow-500"
                            : "text-rose-500",
                      )}
                    >
                      {" "}
                      {power.reading}
                      {power.symbol}
                    </p>
                    <p className="text-sm font-light">
                      PDU:{" "}
                      <a
                        className="inline-flex items-center underline gap-1 decoration-inherit"
                        target="_blank"
                        href={`https://${power.pdu_hostname}`}
                      >
                        <span>{power.pdu_hostname}</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <Card className="w-96 min-h-64">
            <CardHeader className="text-left">
              <div className="w-full">
                <div>
                  <CardTitle>Power Health</CardTitle>
                  <div className="py-10 text-center mx-auto space-y-3">
                    <img
                      className="h-20 w-20 mx-auto"
                      src={
                        theme === "dark"
                          ? "/cube-3d-dark.webp"
                          : "/cube-3d.webp"
                      }
                      alt="Cube"
                    />
                    <p className="text-sm font-light italic text-slate-500 dark:text-slate-400">
                      No data available
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
      <Card className="w-full relative overflow-hidden min-h-64" delay={0.5}>
        {allPowerLoading ? (
          <div className="absolute inset-0 h-full w-full -translate-x-full animate-[shimmer_2s_infinite] overflow-hidden bg-gradient-to-r from-transparent via-slate-200/30 to-transparent dark:via-slate-200/10" />
        ) : currPower.length > 0 ? (
          <>
            <CardHeader className="text-left">
              <div className="flex justify-between w-full items-center gap-2 text-sm">
                <div>
                  <CardTitle>Power Overview</CardTitle>
                  <CardDescription>
                    {"Last checked " + formatDate(currPower[0]?.created)}
                  </CardDescription>
                </div>
                <Select
                  defaultValue="24h"
                  onValueChange={(value: DateRange) =>
                    setSelectedPowerRange(value)
                  }
                >
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder={selectedPowerRange} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Last</SelectLabel>
                      <SelectItem value="24h">24 hours</SelectItem>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="1mnth">1 month</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="mt-4">
              <ChartContainer
                config={chartConfig as any}
                className="aspect-auto h-[250px] w-full"
              >
                <LineChart data={filteredPower}>
                  <CartesianGrid
                    vertical={false}
                    stroke={theme == "dark" ? "#424C5E" : "#D9DEE3"}
                  />
                  <XAxis
                    dataKey="created"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tick={{ fill: theme === "dark" ? "#CBD5E1" : "#334155" }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "2-digit",
                        day: "numeric",
                        hour12: false,
                        timeZone: "UTC",
                      });
                    }}
                  />
                  <YAxis
                    width={35}
                    axisLine={{
                      stroke: theme === "dark" ? "#424C5E" : "#D9DEE3",
                    }}
                    tickLine={{
                      stroke: theme === "dark" ? "#424C5E" : "#D9DEE3",
                    }}
                    tick={{ fill: theme === "dark" ? "#CBD5E1" : "#334155" }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => {
                          return new Date(value).toLocaleDateString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            month: "short",
                            day: "numeric",
                            hour12: false,
                            timeZone: "UTC",
                          });
                        }}
                        indicator="dot"
                      />
                    }
                  />
                  {currPower.length > 0 &&
                    currPower.map((power, index) => (
                      <Line
                        key={index}
                        dataKey={power.location}
                        type="monotone"
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="text-left">
              <div className="w-full">
                <div>
                  <CardTitle>Power Overview</CardTitle>
                  <div className="py-10 text-center mx-auto space-y-3">
                    <img
                      className="h-28 w-28 mx-auto"
                      src={
                        theme === "dark"
                          ? "/cube-3d-dark.webp"
                          : "/cube-3d.webp"
                      }
                      alt="Cube"
                    />
                    <p className="text-sm font-light italic text-slate-500 dark:text-slate-400">
                      No data available
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </>
        )}
      </Card>
    </>
  );
}
