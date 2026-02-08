import { Users, BookOpen, Shield, Sparkles, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { motion, type Easing } from 'framer-motion';

const easeOut: Easing = [0.4, 0, 0.2, 1];

export function HeroSection() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } }
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 pt-20 pb-32">
      {/* Animated decorative elements */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-student-gradient opacity-10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: easeOut }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-teacher-gradient opacity-10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: easeOut, delay: 1.5 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-full blur-3xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary/20 rounded-full"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 15}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            ease: easeOut,
            delay: i * 0.5,
          }}
        />
      ))}

      <motion.div
        className="container mx-auto px-4 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 shadow-md"
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              Complete School Management Solution
            </span>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-4"
            variants={itemVariants}
          >
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent">
              knct
            </span>
            <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              ED
            </span>
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-muted-foreground mb-4 font-medium"
            variants={itemVariants}
          >
            Connecting Education, Empowering Futures
          </motion.p>

          <motion.p
            className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
            variants={itemVariants}
          >
            A comprehensive school management system designed for modern schools.
            Connect students, parents, teachers, and administrators seamlessly.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            variants={itemVariants}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-lg px-8 shadow-lg shadow-primary/25"
                onClick={() => navigate('/demo/student')}
              >
                Explore Demo
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 border-2"
                onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Login to Your Account
              </Button>
            </motion.div>
          </motion.div>

          {/* Feature highlights with staggered animation */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            variants={containerVariants}
          >
            {[
              { icon: GraduationCap, label: 'Student Portal', color: 'text-orange-500', gradient: 'from-orange-500/10 to-orange-600/10', path: '/login/student' },
              { icon: Users, label: 'Parent Access', color: 'text-green-500', gradient: 'from-green-500/10 to-green-600/10', path: '/login/parent' },
              { icon: BookOpen, label: 'Teacher Tools', color: 'text-purple-500', gradient: 'from-purple-500/10 to-purple-600/10', path: '/login/teacher' },
              { icon: Shield, label: 'Admin Control', color: 'text-blue-500', gradient: 'from-blue-500/10 to-blue-600/10', path: '/login/admin' },
            ].map((feature, index) => (
              <motion.button
                key={index}
                onClick={() => navigate(feature.path)}
                className={`flex flex-col items-center gap-2 p-4 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm rounded-xl shadow-sm border border-white/50 w-full transition-all duration-300`}
                variants={itemVariants}
                whileHover={{
                  scale: 1.08,
                  y: -5,
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                  borderColor: 'rgba(255, 255, 255, 0.8)'
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: easeOut, delay: index * 0.3 }}
                >
                  <feature.icon className={`h-8 w-8 ${feature.color}`} />
                </motion.div>
                <span className="text-sm font-medium">{feature.label}</span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
