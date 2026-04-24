import {
  Calendar,
  FileText,
  Bell,
  CreditCard,
  Bus,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
  Library,
  Heart,
  CalendarDays,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import type { CSSProperties } from 'react';

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
};

const features: Feature[] = [
  {
    icon: ClipboardCheck,
    title: 'Attendance Tracking',
    description: 'Real-time attendance marking and tracking for students and teachers',
    accent: '249 115 22',
  },
  {
    icon: FileText,
    title: 'Marks & Reports',
    description: 'Comprehensive exam management with detailed report cards',
    accent: '37 99 235',
  },
  {
    icon: Calendar,
    title: 'Timetable Management',
    description: 'Class-wise timetables accessible to all stakeholders',
    accent: '147 51 234',
  },
  {
    icon: BookOpen,
    title: 'Homework & Assignments',
    description: 'Post, submit, and review homework with Google Drive integration',
    accent: '22 163 74',
  },
  {
    icon: CreditCard,
    title: 'Fee Management',
    description: 'Complete fee structure, payment tracking, and reminders',
    accent: '244 63 94',
  },
  {
    icon: Bell,
    title: 'Announcements',
    description: 'School-wide and class-specific communication system',
    accent: '245 158 11',
  },
  {
    icon: MessageSquare,
    title: 'Parent-Teacher Chat',
    description: 'Direct messaging and meeting scheduling',
    accent: '14 165 233',
  },
  {
    icon: Bus,
    title: 'Transport Management',
    description: 'Bus routes, driver details, and student assignments',
    accent: '234 179 8',
  },
  {
    icon: Library,
    title: 'Library System',
    description: 'Book catalog, issue/return tracking, and fine management',
    accent: '99 102 241',
  },
  {
    icon: CalendarDays,
    title: 'Leave Management',
    description: 'Apply and approve leaves for students and teachers',
    accent: '20 184 166',
  },
  {
    icon: Heart,
    title: 'Health Records',
    description: 'Medical history, vaccinations, and emergency contacts',
    accent: '239 68 68',
  },
  {
    icon: HelpCircle,
    title: 'Complaint System',
    description: 'Submit and track complaints with anonymous option',
    accent: '217 70 239',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.2, 0.65, 0.3, 1] },
  },
};

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 bg-white border-t border-dashed overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(139,92,246,0.05),transparent_70%)]"
      />

      <div className="container relative mx-auto px-4">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-dashed bg-muted/40 px-3.5 py-1 mb-5 text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
            Features
          </div>
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] mb-4">
            Everything your school needs
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-xl mx-auto">
            A comprehensive suite designed specifically for modern Indian schools.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.4, ease: [0.2, 0.65, 0.3, 1] }}
                style={{ '--accent': feature.accent } as CSSProperties}
                className="group relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white p-6 transition-shadow duration-500 hover:border-zinc-300/80 hover:shadow-[0_24px_60px_-24px_rgb(var(--accent)/0.45)]"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[rgb(var(--accent)/0.28)] opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
                />

                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-[rgb(var(--accent)/0.04)] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />

                <div className="relative mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[rgb(var(--accent)/0.1)] ring-1 ring-inset ring-black/[0.04] transition-transform duration-500 group-hover:scale-[1.06]">
                  <div
                    aria-hidden
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/60 to-transparent"
                  />
                  <Icon
                    className="relative h-[18px] w-[18px] text-[rgb(var(--accent))]"
                    strokeWidth={1.75}
                  />
                </div>

                <h3 className="relative mb-1.5 text-[15.5px] font-semibold tracking-tight text-zinc-900">
                  {feature.title}
                </h3>
                <p className="relative text-[13.5px] text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                <div
                  aria-hidden
                  className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-[rgb(var(--accent))] to-transparent transition-transform duration-500 group-hover:scale-x-100"
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
