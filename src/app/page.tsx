import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { ArrowRight, BarChart2, Users, Map, Shield } from 'lucide-react'

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 pointer-events-none" />
          <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center relative">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              Transform Your Real Estate
              <span className="text-primary block">Analytics Game</span>
            </h1>
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl">
              Get real-time insights into your market. Track agents, monitor transactions, and make data-driven decisions with our powerful MLS integration.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/demo">Schedule Demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need to succeed
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful features to help you manage, monitor, and grow your real estate business
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'Agent Tracking',
                  description: 'Monitor agent performance and activity in real-time',
                  icon: Users,
                },
                {
                  title: 'Market Analytics',
                  description: 'Get deep insights into your local real estate market',
                  icon: BarChart2,
                },
                {
                  title: 'ZIP Code Targeting',
                  description: 'Focus on specific areas with ZIP code filtering',
                  icon: Map,
                },
                {
                  title: 'Secure MLS Access',
                  description: 'Direct integration with Rappattoni MLS',
                  icon: Shield,
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="relative p-6 bg-background rounded-lg shadow-sm border"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Trusted by leading real estate professionals
              </h2>
              <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
                {['50+', '1000+', '10K+', '95%'].map((stat, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="text-4xl font-bold text-primary">{stat}</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {index === 0 && 'ZIP Codes'}
                      {index === 1 && 'Active Users'}
                      {index === 2 && 'Transactions'}
                      {index === 3 && 'Satisfaction'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Join thousands of real estate professionals who are already using our platform
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8"
              asChild
            >
              <Link href="/register">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/50">
        <div className="container grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="mt-4 space-y-2">
              {['Features', 'Pricing', 'Solutions', 'Enterprise'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="mt-4 space-y-2">
              {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Resources</h3>
            <ul className="mt-4 space-y-2">
              {['Documentation', 'Help Center', 'API', 'Status'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2">
              {['Privacy', 'Terms', 'Security', 'Cookies'].map((item) => (
                <li key={item}>
                  <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}

