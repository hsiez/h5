import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LocationMapPrototype } from "./LocationMapPrototype";
import { DEFAULT_LOCATION_MAP_STYLE } from "../../app/_components/location-map-style";

const meta: Meta<typeof LocationMapPrototype> = {
  title: "Composites/Location Map Prototype",
  component: LocationMapPrototype,
  parameters: { layout: "fullscreen" },
  argTypes: {
    place: { control: false },
    city: { control: false },
    latitude: { control: { type: "number", step: 0.0001 } },
    longitude: { control: { type: "number", step: 0.0001 } },
    zoom: { control: { type: "range", min: 10, max: 18, step: 0.25 } },
    background: { control: "color" },
    roads: { control: "color" },
    parks: { control: "color" },
    water: { control: "color" },
    buildings: { control: "color" },
    labels: { control: "color" },
    pin: { control: "color" },
    showAttributionInfo: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof LocationMapPrototype>;

export const Ginza: Story = {
  args: {
    ...DEFAULT_LOCATION_MAP_STYLE,
    place: "Kapital Ginza", city: "Tokyo, Japan", latitude: 35.6715, longitude: 139.773, zoom: 14.5,
  },
};

export const Ueno: Story = {
  args: { ...Ginza.args, place: "Ueno", latitude: 35.71, longitude: 139.776, zoom: 13.5 },
};
