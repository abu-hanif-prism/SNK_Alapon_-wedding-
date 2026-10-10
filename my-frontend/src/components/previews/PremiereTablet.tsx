const imgEditorialImageFrame = "/figma/6-592-imgEditorialImageFrame.png";
const imgFrame = "/figma/6-592-imgFrame.svg";
const imgFrame1 = "/figma/6-592-imgFrame1.svg";
const imgShareButton = "/figma/6-592-imgShareButton.svg";
const imgTabletHero = "/figma/6-592-imgTabletHero.png";
const imgRectangle = "/figma/6-592-imgRectangle.png";
const imgRectangle1 = "/figma/6-592-imgRectangle1.png";
const imgRectangle2 = "/figma/6-592-imgRectangle2.png";
const imgRectangle3 = "/figma/6-592-imgRectangle3.png";
const imgRectangle4 = "/figma/6-592-imgRectangle4.png";
const imgRectangle5 = "/figma/6-592-imgRectangle5.png";
const imgRectangle6 = "/figma/6-592-imgRectangle6.png";
const imgRectangle7 = "/figma/6-592-imgRectangle7.png";
const imgRectangle8 = "/figma/6-592-imgRectangle8.png";
const imgArrowRight = "/figma/6-592-imgArrowRight.svg";

function FullscreenImageViewer({ className }: { className?: string }) {
  return (
    <div
      className={
        className ||
        "fg428 fg1 fg2 fg3 fg246 fg4 fg8 fg80 fg365 fg285 fg5 fg269 fg13"
      }
      data-node-id="3:996"
      data-name="Fullscreen Image Viewer"
    >
      <div
        className="fg1 fg2 fg40 fg8 fg5 fg12 fg24"
        data-node-id="3:985"
        data-name="Frame"
      >
        <div className="fg5 fg12 fg348" data-node-id="3:986" data-name="Frame">
          <img alt="" className="fg14 fg46 fg15 fg17 fg6" src={imgFrame} />
        </div>
        <p
          className="fg20 fg29 fg30 fg22 fg31 fg423 fg5 fg12 fg23 fg32 fg25"
          data-node-id="3:988"
        >
          04 of 20
        </p>
        <div
          className="fg1 fg2 fg4 fg5 fg12"
          data-node-id="3:989"
          data-name="Frame"
        >
          <div
            className="fg5 fg12 fg348"
            data-node-id="3:990"
            data-name="Frame"
          >
            <img alt="" className="fg14 fg46 fg15 fg17 fg6" src={imgFrame1} />
          </div>
        </div>
      </div>
      <div
        className="fg66 fg5 fg276 fg12 fg24"
        data-node-id="3:992"
        data-name="editorial-image-frame"
      >
        <img
          alt="Wedding memory"
          tabIndex={0}
          role="button"
          aria-label="Open wedding photograph"
          className="fg14 fg15 fg17 fg18 fg16 fg276 fg6"
          src={imgEditorialImageFrame}
        />
      </div>
      <div
        className="fg20 fg1 fg2 fg3 fg44 fg40 fg22 fg5 fg12 fg23 fg24 fg25"
        data-node-id="3:993"
        data-name="Frame"
      >
        <p className="fg26 fg27 fg5 fg12 fg190" data-node-id="3:994">
          04. Quiet anticipation.
        </p>
        <p className="fg41 fg42 fg31 fg350 fg5 fg12 fg65" data-node-id="3:995">
          Before the ceremony · Amira
        </p>
      </div>
    </div>
  );
}

function ShareButton({ className }: { className?: string }) {
  return (
    <div
      className={className || "fg5 fg339"}
      data-node-id="3:999"
      data-name="Share Button"
    >
      <img alt="" className="fg14 fg46 fg15 fg17 fg6" src={imgShareButton} />
    </div>
  );
}

export default function PremiereTablet() {
  return (
    <div
      className="fg321 fg1 fg2 fg3 fg4 fg5 fg6"
      data-node-id="6:592"
      data-name="premiere-tablet-50-images"
    >
      <div
        className="fg322 fg253 fg92 fg1 fg2 fg40 fg8 fg424 fg425 fg426 fg5 fg12 fg24"
        data-node-id="6:593"
        data-name="tablet-masthead"
      >
        <div
          className="fg20 fg1 fg2 fg3 fg366 fg4 fg22 fg5 fg12 fg33 fg25"
          data-node-id="6:594"
          data-name="branding"
        >
          <p className="fg326 fg327 fg5 fg12 fg328 fg190" data-node-id="6:595">
            THE WEDDING PREMIERE
          </p>
          <p
            className="fg334 fg30 fg5 fg12 fg335 fg65"
            data-node-id="6:596"
          >{`50 CINE STORIES · AMIRA & RAYHAN`}</p>
        </div>
        <div
          className="fg1 fg2 fg34 fg40 fg5 fg12"
          data-node-id="6:597"
          data-name="actions"
        >
          <p
            className="fg20 fg330 fg73 fg22 fg5 fg12 fg351 fg43 fg25"
            data-node-id="6:598"
          >
            TABLET LOG
          </p>
          <ShareButton className="fg5 fg12 fg339" />
        </div>
      </div>
      <div
        className="fg1 fg2 fg3 fg207 fg4 fg8 fg261 fg5 fg12 fg24"
        data-node-id="6:601"
        data-name="tablet-hero"
      >
        <div aria-hidden="true" className="fg14 fg15 fg16">
          <img
            alt="Wedding memory"
            tabIndex={0}
            role="button"
            aria-label="Open wedding photograph"
            className="fg14 fg17 fg18 fg6"
            src={imgTabletHero}
          />
          <div
            className="fg14 fg15"
            style={{
              backgroundImage:
                "linear-gradient(217.99873244250466deg, rgba(11, 10, 9, 0) 25%, rgba(11, 10, 9, 0.949) 75%)",
            }}
          />
        </div>
        <div
          className="fg1 fg2 fg3 fg79 fg4 fg5 fg12 fg24"
          data-node-id="6:602"
          data-name="hero-meta"
        >
          <div
            className="fg20 fg1 fg2 fg3 fg44 fg4 fg22 fg5 fg12 fg24"
            data-node-id="6:603"
            data-name="title-group"
          >
            <p
              className="fg35 fg31 fg5 fg12 fg328 fg226 fg24"
              data-node-id="6:604"
            >{`Amira & Rayhan`}</p>
            <p
              className="fg334 fg30 fg5 fg12 fg351 fg147 fg24"
              data-node-id="6:605"
            >
              DHAKA BANGLADESH · DEC 14, 2026
            </p>
          </div>
          <div
            className="fg1 fg2 fg40 fg5 fg12"
            data-node-id="6:606"
            data-name="action-button-group"
          >
            <p
              className="fg20 fg26 fg27 fg22 fg5 fg12 fg335 fg229 fg25"
              data-node-id="6:611"
            >{`"A digital documentary recorded live"`}</p>
          </div>
        </div>
      </div>
      <div
        className="fg1 fg2 fg3 fg79 fg4 fg284 fg5 fg12 fg24"
        data-node-id="6:612"
        data-name="tablet-featured-moments"
      >
        <div
          className="fg1 fg2 fg21 fg8 fg426 fg5 fg12 fg24"
          data-node-id="6:613"
          data-name="section-header"
        >
          <div
            className="fg1 fg2 fg3 fg44 fg4 fg5 fg12 fg227"
            data-node-id="6:614"
            data-name="chapter-header"
          >
            <div
              className="fg1 fg2 fg44 fg40 fg5 fg12"
              data-node-id="6:615"
              data-name="act-badge"
            >
              <div
                className="fg341 fg5 fg353 fg12 fg354"
                data-node-id="6:616"
                data-name="dot"
              />
              <p
                className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg32 fg33 fg25"
                data-node-id="6:617"
              >
                ACT I
              </p>
            </div>
            <p
              className="fg20 fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg176 fg188"
              data-node-id="6:618"
            >
              The Relived Day
            </p>
            <p
              className="fg20 fg345 fg42 fg22 fg187 fg5 fg12 fg335 fg43 fg188"
              data-node-id="6:619"
            >
              01 — 06 of 50 Highlights
            </p>
          </div>
          <div
            className="fg1 fg2 fg44 fg4 fg5 fg12"
            data-node-id="6:620"
            data-name="scroller-controls"
          >
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg355 fg32 fg25"
              data-node-id="6:621"
            >
              SWIPE TO REVEAL
            </p>
            <div
              className="fg1 fg2 fg40 fg113 fg80 fg5 fg12 fg45"
              data-node-id="6:622"
              data-name="icon-wrapper"
            >
              <div
                className="fg5 fg12 fg45"
                data-node-id="6:829"
                data-name="arrow-right"
              >
                <img
                  alt=""
                  className="fg14 fg46 fg15 fg17 fg6"
                  src={imgArrowRight}
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className="fg1 fg2 fg79 fg4 fg80 fg307 fg5 fg12 fg24"
          data-node-id="6:624"
          data-name="scroller-track"
        >
          <div
            className="fg1 fg2 fg3 fg408 fg4 fg5 fg12 fg101"
            data-node-id="6:625"
            data-name="moment-card"
          >
            <div
              className="fg243 fg5 fg276 fg12 fg24"
              data-node-id="6:626"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg276 fg6"
                src={imgRectangle}
              />
            </div>
            <div
              className="fg20 fg1 fg2 fg3 fg366 fg4 fg22 fg5 fg12 fg180 fg24"
              data-node-id="6:627"
              data-name="Frame"
            >
              <p
                className="fg332 fg333 fg5 fg12 fg328 fg24"
                data-node-id="6:628"
              >
                01. Grand Arrival
              </p>
              <p className="fg26 fg27 fg5 fg12 fg335 fg24" data-node-id="6:629">
                The entrance pavilion lights.
              </p>
            </div>
          </div>
          <div
            className="fg1 fg2 fg3 fg408 fg4 fg5 fg12 fg101"
            data-node-id="6:630"
            data-name="moment-card"
          >
            <div
              className="fg243 fg5 fg276 fg12 fg24"
              data-node-id="6:631"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg276 fg6"
                src={imgRectangle1}
              />
            </div>
            <div
              className="fg20 fg1 fg2 fg3 fg366 fg4 fg22 fg5 fg12 fg180 fg24"
              data-node-id="6:632"
              data-name="Frame"
            >
              <p
                className="fg332 fg333 fg5 fg12 fg328 fg24"
                data-node-id="6:633"
              >
                02. Red Veil Lift
              </p>
              <p
                className="fg26 fg27 fg5 fg12 fg335 fg24"
                data-node-id="6:634"
              >{`Amira's first steps inside.`}</p>
            </div>
          </div>
          <div
            className="fg1 fg2 fg3 fg408 fg4 fg427 fg5 fg12 fg101"
            data-node-id="6:635"
            data-name="moment-card"
          >
            <div
              className="fg243 fg5 fg276 fg12 fg24"
              data-node-id="6:636"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg276 fg6"
                src={imgRectangle2}
              />
            </div>
            <div
              className="fg20 fg1 fg2 fg3 fg366 fg4 fg22 fg5 fg12 fg180 fg24"
              data-node-id="6:637"
              data-name="Frame"
            >
              <p
                className="fg332 fg333 fg5 fg12 fg328 fg24"
                data-node-id="6:638"
              >
                03. Unspoken Devotion
              </p>
              <p className="fg26 fg27 fg5 fg12 fg335 fg24" data-node-id="6:639">
                Rayhan watches the vows.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="fg1 fg2 fg3 fg183 fg4 fg426 fg284 fg5 fg12 fg24"
        data-node-id="6:640"
        data-name="tablet-preparation"
      >
        <div
          className="fg1 fg2 fg3 fg44 fg4 fg5 fg12 fg24"
          data-node-id="6:641"
          data-name="chapter-header"
        >
          <div
            className="fg1 fg2 fg44 fg40 fg5 fg12"
            data-node-id="6:642"
            data-name="act-badge"
          >
            <div
              className="fg341 fg5 fg353 fg12 fg354"
              data-node-id="6:643"
              data-name="dot"
            />
            <p
              className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg32 fg33 fg25"
              data-node-id="6:644"
            >
              ACT II
            </p>
          </div>
          <p
            className="fg20 fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg176 fg188"
            data-node-id="6:645"
          >
            The Quiet Morning
          </p>
          <p
            className="fg20 fg345 fg42 fg22 fg187 fg5 fg12 fg335 fg43 fg188"
            data-node-id="6:646"
          >
            07 — 12 of 50 Stories
          </p>
        </div>
        <div
          className="fg1 fg2 fg177 fg4 fg5 fg12 fg24"
          data-node-id="6:647"
          data-name="duo-grid"
        >
          <div
            className="fg1 fg2 fg62 fg3 fg58 fg4 fg63 fg5"
            data-node-id="6:648"
            data-name="grid-left"
          >
            <div
              className="fg87 fg5 fg195 fg12 fg24"
              data-node-id="6:649"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg195 fg6"
                src={imgRectangle3}
              />
            </div>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg335 fg32 fg25"
              data-node-id="6:650"
            >
              07. Polishing Gold and Scent of Jasmine.
            </p>
          </div>
          <div
            className="fg1 fg2 fg62 fg3 fg58 fg4 fg63 fg5"
            data-node-id="6:651"
            data-name="grid-right"
          >
            <div
              className="fg87 fg5 fg195 fg12 fg24"
              data-node-id="6:652"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg195 fg6"
                src={imgRectangle4}
              />
            </div>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg335 fg32 fg25"
              data-node-id="6:653"
            >{`08. Fitting Rayhan's traditional Sherwani.`}</p>
          </div>
        </div>
      </div>
      <div
        className="fg1 fg2 fg3 fg177 fg4 fg426 fg284 fg5 fg12 fg24"
        data-node-id="6:654"
        data-name="tablet-immersive"
      >
        <div
          className="fg1 fg2 fg3 fg44 fg4 fg5 fg12 fg24"
          data-node-id="6:655"
          data-name="chapter-header"
        >
          <div
            className="fg1 fg2 fg44 fg40 fg5 fg12"
            data-node-id="6:656"
            data-name="act-badge"
          >
            <div
              className="fg341 fg5 fg353 fg12 fg354"
              data-node-id="6:657"
              data-name="dot"
            />
            <p
              className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg32 fg33 fg25"
              data-node-id="6:658"
            >
              ACT III
            </p>
          </div>
          <p
            className="fg20 fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg176 fg188"
            data-node-id="6:659"
          >
            The Sacred Canopy
          </p>
          <p
            className="fg20 fg345 fg42 fg22 fg187 fg5 fg12 fg335 fg43 fg188"
            data-node-id="6:660"
          >
            Interactive Viewer Frame Integration
          </p>
        </div>
        <FullscreenImageViewer className="fg428 fg1 fg2 fg3 fg246 fg4 fg8 fg80 fg365 fg285 fg5 fg269 fg12 fg13" />
      </div>
      <div
        className="fg1 fg2 fg3 fg177 fg4 fg426 fg284 fg5 fg12 fg24"
        data-node-id="6:673"
        data-name="tablet-guest-curations"
      >
        <div
          className="fg1 fg2 fg3 fg44 fg4 fg5 fg12 fg24"
          data-node-id="6:674"
          data-name="chapter-header"
        >
          <div
            className="fg1 fg2 fg44 fg40 fg5 fg12"
            data-node-id="6:675"
            data-name="act-badge"
          >
            <div
              className="fg341 fg5 fg353 fg12 fg354"
              data-node-id="6:676"
              data-name="dot"
            />
            <p
              className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg32 fg33 fg25"
              data-node-id="6:677"
            >
              GUEST ARCHIVE
            </p>
          </div>
          <p
            className="fg20 fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg176 fg188"
            data-node-id="6:678"
          >
            Because You Were There
          </p>
          <p
            className="fg20 fg345 fg42 fg22 fg187 fg5 fg12 fg335 fg43 fg188"
            data-node-id="6:679"
          >{`Candid memories uploaded live from friends & families`}</p>
        </div>
        <div
          className="fg1 fg2 fg34 fg4 fg80 fg5 fg12 fg24"
          data-node-id="6:680"
          data-name="guest-circles-wrap"
        >
          <div
            className="fg1 fg2 fg3 fg44 fg40 fg5 fg12 fg83"
            data-node-id="6:681"
            data-name="Frame"
          >
            <div
              className="fg5 fg429 fg12 fg430"
              data-node-id="6:682"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg429 fg6"
                src={imgRectangle5}
              />
            </div>
            <p
              className="fg20 fg330 fg73 fg22 fg5 fg12 fg328 fg32 fg25"
              data-node-id="6:683"
            >
              Captured by Nadia
            </p>
          </div>
          <div
            className="fg1 fg2 fg3 fg44 fg40 fg5 fg12 fg83"
            data-node-id="6:684"
            data-name="Frame"
          >
            <div
              className="fg5 fg429 fg12 fg430"
              data-node-id="6:685"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg429 fg6"
                src={imgRectangle6}
              />
            </div>
            <p
              className="fg20 fg330 fg73 fg22 fg5 fg12 fg328 fg32 fg25"
              data-node-id="6:686"
            >{`Farhan's Lens`}</p>
          </div>
          <div
            className="fg1 fg2 fg3 fg44 fg40 fg5 fg12 fg83"
            data-node-id="6:687"
            data-name="Frame"
          >
            <div
              className="fg5 fg429 fg12 fg430"
              data-node-id="6:688"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg429 fg6"
                src={imgRectangle7}
              />
            </div>
            <p
              className="fg20 fg330 fg73 fg22 fg5 fg12 fg328 fg32 fg25"
              data-node-id="6:689"
            >{`Zoya's Perspective`}</p>
          </div>
          <div
            className="fg1 fg2 fg3 fg44 fg40 fg5 fg12 fg83"
            data-node-id="6:690"
            data-name="Frame"
          >
            <div
              className="fg5 fg429 fg12 fg430"
              data-node-id="6:691"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg429 fg6"
                src={imgRectangle8}
              />
            </div>
            <p
              className="fg20 fg330 fg73 fg22 fg5 fg12 fg328 fg32 fg25"
              data-node-id="6:692"
            >
              The Cousins
            </p>
          </div>
        </div>
      </div>
      <div
        className="fg356 fg322 fg92 fg103 fg1 fg2 fg3 fg177 fg4 fg9 fg201 fg426 fg5 fg12 fg24"
        data-node-id="6:693"
        data-name="tablet-footer"
      >
        <div
          className="fg20 fg1 fg2 fg3 fg325 fg4 fg22 fg5 fg12 fg100 fg24 fg25"
          data-node-id="6:694"
          data-name="credits"
        >
          <p className="fg326 fg327 fg5 fg12 fg331 fg32" data-node-id="6:695">
            COMPLETE ARCHIVAL EDITION
          </p>
          <p
            className="fg345 fg42 fg5 fg12 fg335 fg65"
            data-node-id="6:696"
          >{`PHOTOGRAPHY — FELLOW GUESTS & NADIA CHOUDHURY`}</p>
          <p className="fg345 fg42 fg5 fg12 fg335 fg65" data-node-id="6:697">
            VENUE — THE SHANGRI-LA PAVILION, DHAKA
          </p>
        </div>
        <div
          className="fg362 fg342 fg5 fg12 fg24"
          data-node-id="6:698"
          data-name="line"
        />
        <p
          className="fg20 fg26 fg27 fg22 fg5 fg12 fg355 fg229 fg100 fg24"
          data-node-id="6:699"
        >{`"Thank you for sharing our quiet start under Dhaka's midnight canopy."`}</p>
      </div>
    </div>
  );
}
