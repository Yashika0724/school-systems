import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Position = {
  left: number;
  width: number;
  opacity: number;
};

export type SlideTabItem = {
  label: string;
  onClick?: () => void;
};

type SlideTabsProps = {
  items: SlideTabItem[];
  defaultSelected?: number;
  className?: string;
};

export const SlideTabs = ({
  items,
  defaultSelected = 0,
  className,
}: SlideTabsProps) => {
  const [position, setPosition] = React.useState<Position>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [selected, setSelected] = React.useState(defaultSelected);
  const tabsRef = React.useRef<Array<HTMLLIElement | null>>([]);

  React.useEffect(() => {
    const selectedTab = tabsRef.current[selected];
    if (selectedTab) {
      const { width } = selectedTab.getBoundingClientRect();
      setPosition({
        left: selectedTab.offsetLeft,
        width,
        opacity: 1,
      });
    }
  }, [selected, items]);

  return (
    <ul
      onMouseLeave={() => {
        const selectedTab = tabsRef.current[selected];
        if (selectedTab) {
          const { width } = selectedTab.getBoundingClientRect();
          setPosition({
            left: selectedTab.offsetLeft,
            width,
            opacity: 1,
          });
        }
      }}
      className={cn(
        "relative mx-auto flex w-fit rounded-full border-2 border-black bg-white p-1 dark:border-white dark:bg-neutral-800",
        className
      )}
    >
      {items.map((item, i) => (
        <Tab
          key={item.label}
          ref={(el) => {
            tabsRef.current[i] = el;
          }}
          setPosition={setPosition}
          onClick={() => {
            setSelected(i);
            item.onClick?.();
          }}
        >
          {item.label}
        </Tab>
      ))}
      <Cursor position={position} />
    </ul>
  );
};

type TabProps = {
  children: React.ReactNode;
  setPosition: React.Dispatch<React.SetStateAction<Position>>;
  onClick?: () => void;
};

const Tab = React.forwardRef<HTMLLIElement, TabProps>(
  ({ children, setPosition, onClick }, ref) => {
    return (
      <li
        ref={ref}
        onClick={onClick}
        onMouseEnter={(e) => {
          const target = e.currentTarget;
          setPosition({
            left: target.offsetLeft,
            width: target.getBoundingClientRect().width,
            opacity: 1,
          });
        }}
        className="relative z-10 block cursor-pointer px-3 py-1.5 text-xs uppercase text-white mix-blend-difference md:px-5 md:py-2.5 md:text-sm"
      >
        {children}
      </li>
    );
  }
);
Tab.displayName = "Tab";

const Cursor = ({ position }: { position: Position }) => {
  return (
    <motion.li
      animate={{ ...position }}
      transition={{ type: "spring", stiffness: 400, damping: 32 }}
      className="absolute z-0 h-7 rounded-full bg-black dark:bg-white md:h-9"
    />
  );
};
