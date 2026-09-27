"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { AnimatedElement } from "@/components/animations/AnimatedElement";
import { AnimatedPage } from "@/components/animations/AnimatedPage";
import { AnimatedSection } from "@/components/animations/AnimatedSection";
import { EditableIcon } from "@/components/cms/EditableIcon";
import { E, EImg } from "@/components/cms/editable";
import type { JsonObject } from "@/components/cms/json";
import { useSection } from "@/components/cms/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const asObject = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};

export default function ContactPage({ content }: { content: JsonObject }) {
  const animations = useSection(["animations"], asObject(content.animations));
  const hero = useSection(["hero"], asObject(content.hero));
  const infoCards = useSection(["infoCards"], (content.infoCards as JsonObject[]) ?? []);
  const form = useSection(["form"], asObject(content.form));
  const mapSrc = useSection(["mapSrc"], String(content.mapSrc ?? ""));
  const businessHours = useSection(["businessHours"], asObject(content.businessHours));
  const cta = useSection(["cta"], asObject(content.cta));
  const hours = Array.isArray(businessHours.hours)
    ? (businessHours.hours as JsonObject[])
    : [];

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = event.target;
    setFormData((current) => ({ ...current, [id]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success("Message sent successfully!");
        setFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Failed to send message");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while sending the message");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedPage id="contact" label="Contact page" animations={animations} className="flex flex-col">
      <AnimatedSection id="hero" label="Contact hero" className="relative h-[40vh] w-full">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 to-black/50" />
        <AnimatedElement id="hero-image" type="image" label="Contact hero image" className="absolute inset-0">
          <EImg path={["hero", "image"]} image={hero.image as any} className="h-full w-full object-cover" />
        </AnimatedElement>
        <div className="container relative z-20 mx-auto flex h-full flex-col justify-center px-4 md:px-6">
          <AnimatedElement id="hero-title" type="heading" label="Contact hero title" as="h1" className="mb-4 text-4xl font-bold text-white md:text-5xl">
            <E path={["hero", "title"]} value={String(hero.title ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement id="hero-description" type="text" label="Contact hero description" as="p" className="max-w-2xl text-xl text-white/90">
            <E path={["hero", "description"]} value={String(hero.description ?? "")} as="span" />
          </AnimatedElement>
        </div>
      </AnimatedSection>

      <AnimatedSection id="contactInfo" label="Contact information" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {infoCards.map((card, index) => {
              const itemId = String(card.id ?? `contact-info-${index}`);
              return (
                <AnimatedElement key={itemId} id={itemId} type="card" label={String(card.title ?? `Contact information ${index + 1}`)} sectionId="contactInfo" staggerIndex={index}>
                  <Card className="border-none shadow-lg">
                    <CardContent className="flex flex-col items-center p-6 text-center">
                      <AnimatedElement id={`${itemId}:icon`} type="icon" label={`${String(card.title ?? "Contact")} icon`} sectionId="contactInfo" className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <EditableIcon path={["infoCards", index, "icon"]} value={card.icon} fallback="MapPin" className="h-8 w-8 text-green-700" />
                      </AnimatedElement>
                      <h3 className="mb-2 text-xl font-bold text-gray-900">
                        <E path={["infoCards", index, "title"]} value={String(card.title ?? "")} as="span" />
                      </h3>
                      <p className="text-gray-700">
                        <E path={["infoCards", index, "description"]} value={String(card.description ?? "")} as="span" multilineBreaks style={{ whiteSpace: "pre-line" }} />
                      </p>
                      {card.action ? (
                        <a href={String(card.href ?? "#")} className="mt-2 font-medium text-green-700 hover:underline">
                          <E path={["infoCards", index, "action"]} value={String(card.action ?? "")} as="span" />
                        </a>
                      ) : null}
                    </CardContent>
                  </Card>
                </AnimatedElement>
              );
            })}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="contactForm" label="Contact form and map" className="bg-gray-50 py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col gap-12 lg:flex-row">
            <AnimatedElement id="contact-form" type="card" label="Contact form" className="lg:w-1/2">
              <AnimatedElement id="form-title" type="heading" label="Contact form heading" as="h2" className="mb-6 text-3xl font-bold text-gray-900">
                <E path={["form", "title"]} value={String(form.title ?? "")} as="span" />
              </AnimatedElement>
              <AnimatedElement id="form-description" type="text" label="Contact form description" as="p" className="mb-8 text-lg text-gray-700">
                <E path={["form", "description"]} value={String(form.description ?? "")} as="span" />
              </AnimatedElement>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name"><E path={["form", "nameLabel"]} value={String(form.nameLabel ?? "")} as="span" /></Label>
                    <Input id="name" placeholder="Your full name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email"><E path={["form", "emailLabel"]} value={String(form.emailLabel ?? "")} as="span" /></Label>
                    <Input id="email" type="email" placeholder="Your email address" value={formData.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone"><E path={["form", "phoneLabel"]} value={String(form.phoneLabel ?? "")} as="span" /></Label>
                  <Input id="phone" placeholder="Your phone number" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message"><E path={["form", "messageLabel"]} value={String(form.messageLabel ?? "")} as="span" /></Label>
                  <Textarea id="message" placeholder="Tell us about your project" rows={5} value={formData.message} onChange={handleChange} required />
                </div>
                <AnimatedElement id="form-button" type="button" label="Contact form submit button">
                  <Button type="submit" className="w-full bg-green-700 hover:bg-green-800" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : String(form.button ?? "Send")}
                  </Button>
                </AnimatedElement>
              </form>
            </AnimatedElement>

            <AnimatedElement id="contact-map" type="image" label="Contact map" className="lg:w-1/2">
              <div className="h-full min-h-[400px] overflow-hidden rounded-lg shadow-xl">
                <iframe src={mapSrc} width="100%" height="100%" style={{ border: 0, minHeight: "400px" }} allowFullScreen loading="lazy" title="SMTS Contracting LLC Location" />
              </div>
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="businessHours" label="Business hours" className="bg-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="md:w-1/2">
              <AnimatedElement id="hours-title" type="heading" label="Business hours heading" as="h2" className="mb-6 text-3xl font-bold text-gray-900">
                <E path={["businessHours", "title"]} value={String(businessHours.title ?? "")} as="span" />
              </AnimatedElement>
              <div className="space-y-4">
                {hours.map((hour, index) => {
                  const itemId = String(hour.id ?? `hours-${index}`);
                  return (
                    <AnimatedElement key={itemId} id={itemId} type="listItem" label={String(hour.label ?? `Business hours ${index + 1}`)} sectionId="businessHours" staggerIndex={index} className="flex justify-between border-b border-gray-200 pb-2">
                      <span className="font-medium"><E path={["businessHours", "hours", index, "label"]} value={String(hour.label ?? "")} as="span" /></span>
                      <span><E path={["businessHours", "hours", index, "value"]} value={String(hour.value ?? "")} as="span" /></span>
                    </AnimatedElement>
                  );
                })}
              </div>
              <div className="mt-8">
                <AnimatedElement id="visit-title" type="heading" label="Visit office heading" as="h3" className="mb-4 text-xl font-bold text-gray-900">
                  <E path={["businessHours", "visitTitle"]} value={String(businessHours.visitTitle ?? "")} as="span" />
                </AnimatedElement>
                <AnimatedElement id="visit-text" type="text" label="Visit office description" as="p" className="mb-4 text-gray-700">
                  <E path={["businessHours", "visitText"]} value={String(businessHours.visitText ?? "")} as="span" />
                </AnimatedElement>
                <div className="flex items-start space-x-2">
                  <EditableIcon path={["businessHours", "addressIcon"]} value={businessHours.addressIcon} fallback="Building" className="mt-1 h-5 w-5 text-green-700" />
                  <p className="text-gray-700"><E path={["businessHours", "address"]} value={String(businessHours.address ?? "")} as="span" multilineBreaks style={{ whiteSpace: "pre-line" }} /></p>
                </div>
              </div>
            </div>
            <AnimatedElement id="hours-image" type="image" label="Business hours image" className="relative h-[400px] w-full overflow-hidden rounded-lg shadow-xl md:w-1/2">
              <EImg path={["businessHours", "image"]} image={businessHours.image as any} className="h-full w-full object-cover" />
            </AnimatedElement>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection id="cta" label="Contact call to action" className="bg-green-700 py-16 text-white">
        <div className="container mx-auto px-4 text-center md:px-6">
          <AnimatedElement id="cta-title" type="heading" label="Contact call to action heading" as="h2" className="mb-4 text-3xl font-bold">
            <E path={["cta", "title"]} value={String(cta.title ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement id="cta-description" type="text" label="Contact call to action description" as="p" className="mx-auto mb-8 max-w-2xl text-xl">
            <E path={["cta", "description"]} value={String(cta.description ?? "")} as="span" />
          </AnimatedElement>
          <AnimatedElement id="cta-buttons" type="button" label="Contact call to action buttons" className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-green-700 hover:bg-gray-100">
              <a href={String(cta.callHref ?? "#")}><E path={["cta", "callButton"]} value={String(cta.callButton ?? "")} as="span" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white bg-transparent text-white hover:bg-white/10">
              <a href={String(cta.emailHref ?? "#")}><E path={["cta", "emailButton"]} value={String(cta.emailButton ?? "")} as="span" /></a>
            </Button>
          </AnimatedElement>
        </div>
      </AnimatedSection>
    </AnimatedPage>
  );
}
