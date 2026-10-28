import { Svg, Circle, Path, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

function base(size: number, color: string, strokeWidth: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.56 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19Z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.13 1.45-4.86 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CheckIcon({ size = 20, color = 'currentColor', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="m5 12.5 4.2 4.2L19 7" />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function ArrowRightIcon({
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

export function ArrowUpIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

export function TrashIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M4 7h16M9 7V4.5h6V7M6.5 7l.8 13h9.4l.8-13M10 11v5M14 11v5" />
    </Svg>
  );
}

export function PencilIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
      <Path d="m14.5 6.5 3 3" />
    </Svg>
  );
}

export function RefreshIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
    </Svg>
  );
}

export function WifiOffIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M3 3l18 18M8.5 8.5A10.5 10.5 0 0 1 21 9M3 9a15.5 15.5 0 0 1 3.1-1.3M6.5 13.4a10.4 10.4 0 0 1 5.7-1.8M9.8 17a3 3 0 0 1 4.4 0M12 21h.01" />
    </Svg>
  );
}

export function SparkleIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M12 3c.4 4.4 2.6 6.6 7 7-4.4.4-6.6 2.6-7 7-.4-4.4-2.6-6.6-7-7 4.4-.4 6.6-2.6 7-7Z" />
      <Path d="M19 16.5c.15 1.65.85 2.35 2.5 2.5-1.65.15-2.35.85-2.5 2.5-.15-1.65-.85-2.35-2.5-2.5 1.65-.15 2.35-.85 2.5-2.5Z" />
    </Svg>
  );
}

export function LogoutIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M9 12h10" />
    </Svg>
  );
}

export function ChevronRightIcon({
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function MonitorIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Rect x="3" y="4" width="18" height="12" rx="2" />
      <Path d="M8 20h8M12 16v4" />
    </Svg>
  );
}

export function InfoIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5M12 8h.01" />
    </Svg>
  );
}

export function SunIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function MoonIcon({ size = 20, color = 'currentColor', strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg {...base(size, color, strokeWidth)}>
      <Path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />
    </Svg>
  );
}
