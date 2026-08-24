import ClientPowerRack from "@/components/client-power-rack";

export default async function PowerRack({
  params,
}: {
  params: Promise<{ rack: string }>;
}) {
  const { rack } = await params;

  return <ClientPowerRack datahall="dh1" site="odcdh1" rack={rack} />;
} 