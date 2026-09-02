import { ExpandMore } from "@mui/icons-material";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { AssetDef } from "../assets-drawer/AssetsDrawer";
import Image from "next/image";
import { usePlacement } from "../context/PlacementContext";

interface CategoryAccordionProps {
  title: string;
  assetDefs: AssetDef[];
}

export default function CategoryAccordion({ title, assetDefs }: CategoryAccordionProps) {
  const { startPlacing } = usePlacement();
  const handleDragStart = (e: React.DragEvent, asset: AssetDef) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Accordion className="rounded">
      <AccordionSummary
        expandIcon={<ExpandMore />}
        className="text-white font-semibold bg-neutral-700 hover:bg-neutral-600 rounded cursor-pointer"
        aria-controls='camper-days-content'
        id='camper-days-header'
      >
        {title}
      </AccordionSummary>
      <AccordionDetails>
        <div className="flex gap-2 mt-2 flex-wrap">
          {assetDefs.map((asset) => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => handleDragStart(e, asset)}
              onClick={() => startPlacing(asset)}
              className="p-3 bg-neutral-700 hover:bg-neutral-600 rounded cursor-grab active:cursor-grabbing text-white justify-between items-center border border-neutral-600"
            >
              <Image 
                src={asset.src}
                alt={asset.name}
                width={48}
                height={48}
              />
            </div>
          ))}
        </div>
      </AccordionDetails>
    </Accordion>
  );
}
