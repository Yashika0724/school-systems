import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  GraduationCap,
  Users,
  BookOpen,
  Sparkles,
  School,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SlideTabs } from "@/components/ui/slide-tabs";
import { cn } from "@/lib/utils";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.2, 0.65, 0.3, 1] },
  },
};

const imageVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.9, ease: [0.2, 0.65, 0.3, 1], delay: 0.4 },
  },
};

type MenuItem = {
  name: string;
  href: string;
  isRoute?: boolean;
};

const menuItems: MenuItem[] = [
  { name: "Features", href: "#features" },
  { name: "Login", href: "/login", isRoute: true },
  { name: "Admissions", href: "/admissions", isRoute: true },
  { name: "About", href: "#about" },
];

export const HeroSection = () => {
  const [menuState, setMenuState] = React.useState(false);
  const navigate = useNavigate();

  const handleMenuClick = (item: MenuItem) => {
    setMenuState(false);
    if (item.isRoute) {
      navigate(item.href);
    } else {
      const target = document.querySelector(item.href);
      target?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const slideTabItems = menuItems.map((item) => ({
    label: item.name,
    onClick: () => handleMenuClick(item),
  }));

  return (
    <div>
      <header>
        <nav
          data-state={menuState ? "active" : undefined}
          className="group fixed z-20 w-full bg-white/70 backdrop-blur md:relative md:bg-transparent md:backdrop-blur-none dark:bg-zinc-950/50 md:dark:bg-transparent"
        >
          <div className="m-auto max-w-6xl px-6">
            <div className="relative flex items-center justify-between py-3 lg:py-4">
              {/* Left: Logo */}
              <Link
                to="/"
                aria-label="KnctED home"
                className="flex items-center space-x-2"
              >
                <Logo />
              </Link>

              {/* Center: SlideTabs (desktop only, absolutely centered) */}
              <SlideTabs
                items={slideTabItems}
                className="absolute left-1/2 -translate-x-1/2 hidden lg:flex"
              />

              {/* Right: CTAs (desktop only) */}
              <div className="hidden lg:flex items-center gap-3">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/login">
                    <span>Login</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/admissions">
                    <span>Apply</span>
                  </Link>
                </Button>
              </div>

              {/* Mobile: hamburger toggle */}
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>

              {/* Mobile: collapsible dropdown */}
              <div className="group-data-[state=active]:block hidden absolute left-0 right-0 top-full mt-2 rounded-3xl border bg-background p-6 shadow-2xl shadow-zinc-300/20 lg:hidden dark:shadow-none">
                <ul className="space-y-5 text-base">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      {item.isRoute ? (
                        <Link
                          to={item.href}
                          onClick={() => setMenuState(false)}
                          className="text-muted-foreground hover:text-foreground block duration-150"
                        >
                          <span>{item.name}</span>
                        </Link>
                      ) : (
                        <a
                          href={item.href}
                          onClick={() => setMenuState(false)}
                          className="text-muted-foreground hover:text-foreground block duration-150"
                        >
                          <span>{item.name}</span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild variant="outline" size="sm" className="rounded-full w-full">
                    <Link to="/login" onClick={() => setMenuState(false)}>
                      <span>Login</span>
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="rounded-full w-full">
                    <Link to="/admissions" onClick={() => setMenuState(false)}>
                      <span>Apply</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <div
          aria-hidden
          className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block"
        >
          <div className="w-[35rem] h-[80rem] -translate-y-[21.875rem] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(221,83%,53%,0.08)_0,hsla(262,83%,58%,0.04)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(262,83%,58%,0.06)_0,hsla(262,83%,45%,0.02)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="h-[80rem] -translate-y-[21.875rem] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(24,95%,53%,0.06)_0,hsla(24,95%,45%,0.02)_80%,transparent_100%)]" />
        </div>

        <section className="overflow-hidden bg-white dark:bg-transparent">
          <div className="relative mx-auto max-w-5xl px-6 pt-10 pb-28 lg:pt-14 lg:pb-32">
            <motion.div
              className="relative z-10 mx-auto max-w-2xl text-center"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-2 rounded-full border border-dashed bg-muted/40 px-3.5 py-1 mb-8 text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                <span>School management, reimagined</span>
              </motion.div>
              <motion.h1
                variants={itemVariants}
                className="text-balance text-5xl font-medium tracking-tight leading-[1.05] md:text-6xl lg:text-7xl"
              >
                One platform for your{" "}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_8s_linear_infinite]">
                  entire school
                </span>
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mx-auto mt-6 mb-10 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed"
              >
                KnctED brings students, parents, teachers, and administrators
                together in one seamless workspace — attendance, fees, homework,
                and communication, all in one place.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button asChild size="lg" className="rounded-full px-7 transition-transform hover:scale-[1.03] active:scale-[0.98]">
                  <Link to="/demo/student">
                    <span className="btn-label">Explore Demo</span>
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-7 transition-transform hover:scale-[1.03] active:scale-[0.98]">
                  <Link to="/admissions">
                    <span>Apply for Admission</span>
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            className="mx-auto -mt-16 max-w-7xl [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]"
            variants={imageVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="[perspective:1200px] [mask-image:linear-gradient(to_right,black_50%,transparent_100%)] -mr-16 pl-16 lg:-mr-56 lg:pl-56">
              <div className="[transform:rotateX(20deg);]">
                <div className="lg:h-[44rem] relative skew-x-[.36rad]">
                  <img
                    className="rounded-[var(--radius)] z-[2] relative border shadow-2xl shadow-zinc-300/30"
                    src="/hero-dashboard.png"
                    alt="KnctED admin dashboard preview"
                    width={1920}
                    height={1080}
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section
          id="about"
          className="bg-background relative z-10 py-20 border-t border-dashed"
        >
          <div className="m-auto max-w-5xl px-6">
            <motion.h2
              className="text-center text-[11px] font-medium text-muted-foreground uppercase tracking-[0.2em]"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.2, 0.65, 0.3, 1] }}
            >
              Built for every role in your school
            </motion.h2>
            <motion.div
              className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-10 sm:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
            >
              {[
                { icon: GraduationCap, label: "Students", value: "10K+" },
                { icon: Users, label: "Parents", value: "8K+" },
                { icon: BookOpen, label: "Teachers", value: "500+" },
                { icon: School, label: "Schools", value: "50+" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <stat.icon className="h-5 w-5 text-muted-foreground/70" strokeWidth={1.5} />
                  <div className="text-3xl md:text-4xl font-medium tracking-tighter">
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500 shadow-sm">
        <GraduationCap className="h-4 w-4 text-white" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-bold tracking-tight">
        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent">
          knct
        </span>
        <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
          ED
        </span>
      </span>
    </div>
  );
};
