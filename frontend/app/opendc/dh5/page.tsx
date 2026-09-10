"use client";
import axios from "axios";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TempInfo } from "@/components/temp-info";
import { useTheme } from "next-themes";
import { OpenDCDH5 } from "@/components/room-visualizer/opendc-dh5";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/utils";
import { PowerInfo } from "@/components/power-info";

export default function OpenDCRoom5() {
  const { theme, setTheme } = useTheme();
  const [currPower, setCurrPower] = useState<any[]>([]);
  const [currTemperature, setCurrTemperature] = useState<any[]>([]);

  // FUNCTIONS
  const getCurrPower = async () => {
    try {
      const listResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pdu/list?site=odc&data_hall=dh5`
      );
      const pdus = listResponse.data?.pdus || [];

      const readings = await Promise.all(
        pdus.map(async (pdu: any) => {
          try {
            const powerResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pdu/power/latest?hostname=${encodeURIComponent(
                pdu.hostname
              )}`
            );

            return {
              pdu_hostname: pdu.hostname,
              location: [pdu.rack, pdu.level].filter(Boolean).join("-"),
              reading: powerResponse.data?.power?.reading,
              symbol: powerResponse.data?.power?.unit,
              created: powerResponse.data?.timestamp,
            };
          } catch (error) {
            console.error(`Failed to read power for ${pdu.hostname}:`, error);
            return null;
          }
        })
      );

      setCurrPower(readings.filter(Boolean));
    } catch (e) {
      console.error("Failed to fetch PDU power:", e);
      setCurrPower([]);
    }
  };

  const getCurrTemperature = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/temperature/latest?site=odcdh5`,
      );
      if (response && response.status === 200) {
        setCurrTemperature(response.data || []);
      } else {
        console.error("Failed to fetch data");
      }
    } catch (e) {
      console.log(e);
    }
  };

  //EFFECTS
  useEffect(() => {
    const fetchCurrData = async () => {
      getCurrPower();
      getCurrTemperature();
    };
    fetchCurrData();
    const intervalId = setInterval(fetchCurrData, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      <p className="flex text-xl font-bold text-left pb-3">
        OpenDC - Data Hall 5
      </p>
      <div className="flex w-full space-x-3">
        <div className="flex flex-col items-start space-y-3 w-5/6">
          <Card className="w-full p-2">
            <CardHeader className="text-left">
              <CardTitle>Room Visualiser</CardTitle>
              <CardDescription>
                {currPower.length > 0 &&
                  "Last checked " + formatDate(currPower[0].created)}
              </CardDescription>
              <div className="w-full h-full relative rounded-lg p-2 bg-background/40 dark:bg-secondary-dark/40 border-slate-200 dark:border-[#424C5E] border">
                <OpenDCDH5 theme={theme} powerData={currPower} temperatureData={currTemperature} />
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
