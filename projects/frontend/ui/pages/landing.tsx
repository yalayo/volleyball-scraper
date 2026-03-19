import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Volleyball, 
  Trophy, 
  Users, 
  TrendingUp, 
  Target, 
  Star,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Award,
  Calendar,
  MapPin
} from "lucide-react";

interface LandingProps {
  onSignIn?: () => void;
  onSignUp?: () => void;
  onEnter?: () => void;
}

export default function Landing(props: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Volleyball className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">VolleyStats Pro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={props.onSignIn}>
                Admin Login
              </Button>
              <Button onClick={props.onSignUp}>
                Join Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">
              <Star className="h-4 w-4 mr-1" />
              Trusted by 200+ Teams Across Germany
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              The Complete
              <span className="text-blue-600 block">Volleyball Analytics Platform</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Comprehensive player tracking, team analytics, and performance insights for volleyball athletes, 
              coaches, and clubs across all German leagues.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={props.onSignUp}>
                Start Your Journey
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={props.onEnter}>
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From individual player development to team strategy optimization, 
              we provide the tools that matter most.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Deep performance insights with real-time statistics from live matches across all German leagues.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Match-by-match tracking
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Team performance metrics
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    League standings & trends
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>Player Development</CardTitle>
                <CardDescription>
                  Personal dashboards and verified accounts for athletes to track their volleyball journey.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    SAMS player verification
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Training session coordination
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Teammate networking
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Trophy className="h-12 w-12 text-yellow-600 mb-4" />
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Comprehensive tools for coaches and club representatives to manage teams and analyze performance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Roster management
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Performance highlights
                  </li>
                  <li className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Strategic insights
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Built for the Volleyball Community
            </h2>
            <p className="text-lg text-gray-600">
              Whether you're just starting or competing at the highest level, we have solutions for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <Target className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <CardTitle className="text-lg">Players</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Track your progress, connect with teammates, and showcase your volleyball journey.
                </p>
                <Button className="w-full mt-4" variant="outline" size="sm">
                  Register as Player
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Award className="h-10 w-10 text-green-600 mx-auto mb-3" />
                <CardTitle className="text-lg">Trainers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Analyze team performance, organize training sessions, and develop winning strategies.
                </p>
                <Button className="w-full mt-4" variant="outline" size="sm">
                  Join as Trainer
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                <CardTitle className="text-lg">Clubs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Manage multiple teams, track club-wide statistics, and enhance member engagement.
                </p>
                <Button className="w-full mt-4" variant="outline" size="sm">
                  Register Club
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center border-2 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
                <CardTitle className="text-lg">Sponsors</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Reach the volleyball community with targeted advertising and brand partnerships.
                </p>
                <Button className="w-full mt-4" size="sm">
                  Advertise With Us
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">240+</div>
              <div className="text-blue-200">Active Players</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">16</div>
              <div className="text-blue-200">Teams Tracked</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2</div>
              <div className="text-blue-200">German Leagues</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-200">Matches Analyzed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join the growing community of volleyball athletes and teams using VolleyStats Pro 
            to reach their full potential.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={props.onSignUp}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={props.onEnter}>
              View Dashboard
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <Volleyball className="h-6 w-6" />
                <span className="font-bold">VolleyStats Pro</span>
              </div>
              <p className="text-gray-400 text-sm">
                The complete volleyball analytics platform for German leagues.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Players</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Register Account</li>
                <li>Player Dashboard</li>
                <li>Team Finder</li>
                <li>Training Sessions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Teams & Clubs</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Team Management</li>
                <li>Performance Analytics</li>
                <li>Player Recruitment</li>
                <li>Match Analysis</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Sponsors</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Advertising Options</li>
                <li>Brand Partnerships</li>
                <li>Community Reach</li>
                <li>Contact Sales</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 VolleyStats Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}