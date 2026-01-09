import { GraduationCap, Users, BookOpen, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-orange-50 pt-20 pb-32">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-student-gradient opacity-10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teacher-gradient opacity-10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 shadow-md">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Complete School Management Solution
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 bg-clip-text text-transparent">
            Vidya Setu
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            विद्या सेतु - Bridge to Knowledge
          </p>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive school management system designed for Indian schools. 
            Connect students, parents, teachers, and administrators seamlessly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-lg px-8"
              onClick={() => navigate('/demo/student')}
            >
              Explore Demo
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8"
              onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Login to Your Account
            </Button>
          </div>
          
          {/* Feature highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Users, label: 'Student Portal', color: 'text-orange-500' },
              { icon: Users, label: 'Parent Access', color: 'text-green-500' },
              { icon: BookOpen, label: 'Teacher Tools', color: 'text-purple-500' },
              { icon: Shield, label: 'Admin Control', color: 'text-blue-500' },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 p-4 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm"
              >
                <feature.icon className={`h-8 w-8 ${feature.color}`} />
                <span className="text-sm font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
