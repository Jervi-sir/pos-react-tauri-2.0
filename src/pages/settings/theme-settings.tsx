import { useTheme } from "@/components/theme-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Monitor, Moon, Sun } from "lucide-react";

const SIDEBAR_VARIANTS = [
  { value: "floating", label: "Floating" },
  { value: "inset", label: "Inset" },
  { value: "sidebar", label: "Sidebar" },
];

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    icon: <Sun className="w-4 h-4 mr-2" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon className="w-4 h-4 mr-2" />,
  },
  {
    value: "system",
    label: "System",
    icon: <Monitor className="w-4 h-4 mr-2" />,
  },
];

export const ThemeSettings = () => {
  const { sidebarVariant, setSidebarVariant, theme, setTheme } = useTheme()

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex gap-10">
            <div className="space-y-2">
              <Label htmlFor="sidebar_variant">Sidebar Variant</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue>
                    {THEME_OPTIONS.find(opt => opt.value === theme)?.icon}
                    {THEME_OPTIONS.find(opt => opt.value === theme)?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center">
                        {opt.icon}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sidebar_variant">Sidebar Variant</Label>
              <Select
                value={sidebarVariant}
                onValueChange={(value: any) => setSidebarVariant(value)}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sidebar Variant</SelectLabel>
                    {SIDEBAR_VARIANTS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>


    </>
  );
};
