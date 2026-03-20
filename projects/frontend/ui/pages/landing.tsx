import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LanguageSwitcher from "@/components/ui/language-switcher";
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
} from "lucide-react";

interface LandingProps {
  onSignIn?: () => void;
  onPlayerSignIn?: () => void;
  onSignUp?: () => void;
  onEnter?: () => void;
}

export default function Landing(props: LandingProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Volleyball className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">{t("landing.brand")}</span>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Button variant="ghost" size="sm" onClick={props.onPlayerSignIn}>
                {t("nav.playerLogin")}
              </Button>
              <Button variant="ghost" size="sm" onClick={props.onSignIn}>
                {t("nav.adminLogin")}
              </Button>
              <Button onClick={props.onSignUp}>
                {t("nav.joinNow")}
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
              {t("landing.hero.badge")}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t("landing.hero.headline1")}
              <span className="text-blue-600 block">{t("landing.hero.headline2")}</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t("landing.hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={props.onSignUp}>
                {t("landing.hero.ctaPrimary")}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={props.onEnter}>
                {t("landing.hero.ctaSecondary")}
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
              {t("landing.features.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("landing.features.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle>{t("landing.features.analytics.title")}</CardTitle>
                <CardDescription>{t("landing.features.analytics.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(["item1", "item2", "item3"] as const).map((item) => (
                    <li key={item} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      {t(`landing.features.analytics.${item}`)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle>{t("landing.features.playerDev.title")}</CardTitle>
                <CardDescription>{t("landing.features.playerDev.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(["item1", "item2", "item3"] as const).map((item) => (
                    <li key={item} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      {t(`landing.features.playerDev.${item}`)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Trophy className="h-12 w-12 text-yellow-600 mb-4" />
                <CardTitle>{t("landing.features.teamMgmt.title")}</CardTitle>
                <CardDescription>{t("landing.features.teamMgmt.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(["item1", "item2", "item3"] as const).map((item) => (
                    <li key={item} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      {t(`landing.features.teamMgmt.${item}`)}
                    </li>
                  ))}
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
              {t("landing.audience.title")}
            </h2>
            <p className="text-lg text-gray-600">
              {t("landing.audience.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <Target className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <CardTitle className="text-lg">{t("landing.audience.players.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{t("landing.audience.players.description")}</p>
                <Button className="w-full mt-4" variant="outline" size="sm" onClick={props.onSignUp}>
                  {t("landing.audience.players.cta")}
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Award className="h-10 w-10 text-green-600 mx-auto mb-3" />
                <CardTitle className="text-lg">{t("landing.audience.trainers.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{t("landing.audience.trainers.description")}</p>
                <Button className="w-full mt-4" variant="outline" size="sm">
                  {t("landing.audience.trainers.cta")}
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-10 w-10 text-purple-600 mx-auto mb-3" />
                <CardTitle className="text-lg">{t("landing.audience.clubs.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{t("landing.audience.clubs.description")}</p>
                <Button className="w-full mt-4" variant="outline" size="sm">
                  {t("landing.audience.clubs.cta")}
                </Button>
              </CardContent>
            </Card>

            <Card className="text-center border-2 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-yellow-600 mx-auto mb-3" />
                <CardTitle className="text-lg">{t("landing.audience.sponsors.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{t("landing.audience.sponsors.description")}</p>
                <Button className="w-full mt-4" size="sm">
                  {t("landing.audience.sponsors.cta")}
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
              <div className="text-blue-200">{t("landing.stats.activePlayers")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">16</div>
              <div className="text-blue-200">{t("landing.stats.teamsTracked")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2</div>
              <div className="text-blue-200">{t("landing.stats.germanLeagues")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-200">{t("landing.stats.matchesAnalyzed")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t("landing.cta.title")}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {t("landing.cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={props.onSignUp}>
              {t("landing.cta.primary")}
            </Button>
            <Button size="lg" variant="outline" onClick={props.onEnter}>
              {t("landing.cta.secondary")}
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
                <span className="font-bold">{t("landing.brand")}</span>
              </div>
              <p className="text-gray-400 text-sm">{t("landing.footer.tagline")}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("landing.footer.playersSection")}</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>{t("landing.footer.playersLinks.register")}</li>
                <li>{t("landing.footer.playersLinks.dashboard")}</li>
                <li>{t("landing.footer.playersLinks.teamFinder")}</li>
                <li>{t("landing.footer.playersLinks.training")}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("landing.footer.teamsSection")}</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>{t("landing.footer.teamsLinks.management")}</li>
                <li>{t("landing.footer.teamsLinks.analytics")}</li>
                <li>{t("landing.footer.teamsLinks.recruitment")}</li>
                <li>{t("landing.footer.teamsLinks.analysis")}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t("landing.footer.sponsorsSection")}</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>{t("landing.footer.sponsorsLinks.advertising")}</li>
                <li>{t("landing.footer.sponsorsLinks.partnerships")}</li>
                <li>{t("landing.footer.sponsorsLinks.reach")}</li>
                <li>{t("landing.footer.sponsorsLinks.contact")}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>{t("landing.footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
