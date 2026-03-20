import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === "de" ? "en" : "de";
    i18n.changeLanguage(next);
    localStorage.setItem("language", next);
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle}>
      {i18n.language === "de" ? "EN" : "DE"}
    </Button>
  );
}
