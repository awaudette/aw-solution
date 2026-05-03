import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import AppFeatures from "@/components/AppFeatures";
import DashboardFeatures from "@/components/DashboardFeatures";
import HowItWorks from "@/components/HowItWorks";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <div id="hero"><Hero /></div>
      <div id="probleme"><Problem /></div>
      <div id="app"><AppFeatures /></div>
      <div id="dashboard"><DashboardFeatures /></div>
      <div id="comment"><HowItWorks /></div>
      <div id="contact"><CTA /></div>
      <Footer />
    </>
  );
}
