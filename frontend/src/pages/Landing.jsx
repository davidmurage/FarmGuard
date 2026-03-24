import { Link } from "react-router-dom";

import alertIcon from "../assets/alert icon.jpg";
import analysisIcon from "../assets/ai analysis icon.jpg";
import collectionIcon from "../assets/data collection icon.jpg";
import { getAuth } from "../lib/authStore";
import { roleHome } from "../utils/auth";
import "../styles/LandingPage.css";

export default function LandingPage() {
  const auth = getAuth();
  const primaryHref = auth.user ? roleHome(auth.user.role) : "/signup";
  const primaryLabel = auth.user ? "Open Dashboard" : "Get Started";

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-left">
            <h1 className="hero-title">
              AI-Powered Early<br />Warning System<br />for Agriculture
            </h1>
            <p className="hero-sub">
              Monitors farm and community data to predict disease risks and enable prevention before they occur.
            </p>
            <div className="hero-actions">
              <Link to={primaryHref} className="btn btn-primary">{primaryLabel}</Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="phone">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="dash-title">Dashboard</div>
                <div className="map" />
                <div className="alert">
                  <span className="badge">Alert</span>
                  <span className="alert-text">Loc: Nyandarua</span>
                </div>
                <div className="recent">Recent Reports</div>
                <ul className="list">
                  <li><span className="avatar" /> Anthrax (cattle) - 2 km</li>
                  <li><span className="avatar" /> Maize blight - 28 m</li>
                  <li><span className="avatar" /> Weather - 85 F</li>
                </ul>
              </div>
            </div>
            <div className="farmer-blob" />
          </div>
        </div>
      </section>

      <section id="about" className="about">
        <div className="container about-grid">
          <div>
            <h2 className="section-title">About FarmGuard</h2>
            <div className="divider" />
            <p className="about-text">
              FarmGuard was developed to assist, in precise and data-driven ways, by detecting outbreaks before they occur.
              Prevent crop losses and protect both livestock and public health.
            </p>
          </div>
          <div className="cow-card" />
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Features</h2>

          <div className="features-grid">
            <div className="feat">
              <img src={collectionIcon} alt="Data collection" className="feat-icon" />
              <div className="feat-title">Data Collection</div>
              <div className="feat-desc">Gather information from farmers, vets, weather and satellite.</div>
            </div>
            <div className="feat">
              <img src={analysisIcon} alt="AI analysis" className="feat-icon" />
              <div className="feat-title">AI Analysis</div>
              <div className="feat-desc">Use AI models to assess risks based on collected data.</div>
            </div>
            <div className="feat">
              <img src={alertIcon} alt="Alerts and insights" className="feat-icon" />
              <div className="feat-title">Alerts & Insights</div>
              <div className="feat-desc">Receive instant notifications and access risk maps and dashboards.</div>
            </div>
          </div>

          <div id="contact" className="cta-row">
            <a href="mailto:hello@farmguard.example" className="btn btn-outline">Contact Us</a>
          </div>
        </div>
      </section>
    </main>
  );
}
