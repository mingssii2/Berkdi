import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { Project } from "../store"

interface ProjectComboboxProps {
  projects: Project[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ProjectCombobox({ projects, value, onChange, placeholder = "ค้นหาโครงการ..." }: ProjectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedProject = projects.find((project) => project.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger 
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between rounded-xl h-12 bg-slate-50 border-slate-200 text-left font-normal"
          >
            {selectedProject
              ? `${selectedProject.code} - ${selectedProject.name}`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="พิมพ์รหัสหรือชื่อโครงการ..." />
          <CommandList>
            <CommandEmpty>ไม่พบโครงการ</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.code} ${project.name}`}
                  onSelect={() => {
                    onChange(project.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === project.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {project.code} - {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
