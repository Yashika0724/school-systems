import { GraduationCap, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="h-8 w-8" />
              <div>
                <h3 className="font-bold text-xl">Vidya Setu</h3>
                <p className="text-xs opacity-70">विद्या सेतु - Bridge to Knowledge</p>
              </div>
            </div>
            <p className="text-sm opacity-70 max-w-md">
              A comprehensive school management system designed for Indian schools. 
              Streamline administration, enhance communication, and improve educational outcomes.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm opacity-70">
              <li><a href="#" className="hover:opacity-100 transition-opacity">About Us</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Features</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Pricing</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Contact</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm opacity-70">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                info@vidyasetu.edu
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                +91 11 2345 6789
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>123, Education Lane,<br />New Delhi - 110001</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm opacity-50">
          <p>© 2024 Vidya Setu. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
