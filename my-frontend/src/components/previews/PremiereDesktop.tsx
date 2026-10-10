const imgEditorialImageFrame = "/figma/6-701-imgEditorialImageFrame.png";
const imgPremiereDownloadButton = "/figma/6-701-imgPremiereDownloadButton.svg";
const imgPremiereShareButton = "/figma/6-701-imgPremiereShareButton.svg";
const imgShareButton = "/figma/6-701-imgShareButton.svg";
const imgRectangle = "/figma/6-701-imgRectangle.png";
const imgRectangle1 = "/figma/6-701-imgRectangle1.png";
const imgRectangle2 = "/figma/6-701-imgRectangle2.png";
const imgRectangle3 = "/figma/6-701-imgRectangle3.png";
const imgRectangle4 = "/figma/6-701-imgRectangle4.png";
const imgRectangle5 = "/figma/6-701-imgRectangle5.png";
const imgRectangle6 = "/figma/6-701-imgRectangle6.png";
const imgRectangle7 = "/figma/6-701-imgRectangle7.png";
const imgRectangle8 = "/figma/6-701-imgRectangle8.png";
const imgRectangle9 = "/figma/6-701-imgRectangle9.png";
const imgRectangle10 = "/figma/6-701-imgRectangle10.png";

function LandscapeImage({ className }: { className?: string }) {
  return (
    <div
      className={className || "fg1 fg2 fg3 fg44 fg4 fg11 fg5 fg13"}
      data-node-id="3:957"
      data-name="Landscape Image"
    >
      <div
        className="fg71 fg5 fg276 fg12 fg24"
        data-node-id="3:955"
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
      <p
        className="fg20 fg41 fg42 fg22 fg31 fg5 fg12 fg61 fg65 fg25"
        data-node-id="3:956"
      >
        05. Dinner is served under the stars.
      </p>
    </div>
  );
}

function ImageCaption({ className }: { className?: string }) {
  return (
    <div
      className={
        className ||
        '[word-break:break-word] content-stretch flex font-["Inter:Regular"] font-normal items-start justify-between leading-[normal] not-italic px-[24px] relative text-[#7e7973] w-[390px] whitespace-nowrap'
      }
      data-node-id="3:975"
      data-name="Image Caption"
    >
      <p className="fg5 fg12 fg32" data-node-id="3:973">
        08. The glowing courtyard.
      </p>
      <p className="fg5 fg12 fg65" data-node-id="3:974">
        Dhaka, 11:15 PM
      </p>
    </div>
  );
}

function PremiereDownloadButton({ className }: { className?: string }) {
  return (
    <div
      className={className || "fg5 fg348"}
      data-node-id="6:1188"
      data-name="Premiere / Download Button"
    >
      <img
        alt=""
        className="fg14 fg46 fg15 fg17 fg6"
        src={imgPremiereDownloadButton}
      />
    </div>
  );
}

function PremiereShareButton({ className }: { className?: string }) {
  return (
    <div
      className={className || "fg5 fg115"}
      data-node-id="6:1185"
      data-name="Premiere / Share Button"
    >
      <img
        alt=""
        className="fg14 fg46 fg15 fg17 fg6"
        src={imgPremiereShareButton}
      />
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

export default function PremiereDesktop() {
  return (
    <div
      className="fg321 fg1 fg2 fg3 fg4 fg5 fg6"
      data-node-id="6:701"
      data-name="premiere-desktop-50-images"
    >
      <div
        className="fg322 fg253 fg92 fg1 fg2 fg40 fg8 fg323 fg218 fg324 fg5 fg12 fg24"
        data-node-id="6:702"
        data-name="desktop-nav"
      >
        <div
          className="fg20 fg1 fg2 fg3 fg325 fg4 fg22 fg5 fg12 fg33 fg25"
          data-node-id="6:703"
          data-name="brand-anchor"
        >
          <p className="fg326 fg327 fg5 fg12 fg328 fg329" data-node-id="6:704">
            THE WEDDING PREMIERE
          </p>
          <p className="fg330 fg73 fg5 fg12 fg331 fg32" data-node-id="6:705">
            DIGITAL CINEMATIC DOCUMENTARY
          </p>
        </div>
        <div
          className="fg1 fg2 fg96 fg40 fg5 fg12"
          data-node-id="6:706"
          data-name="nav-links"
        >
          <p
            className="fg20 fg332 fg333 fg22 fg5 fg12 fg328 fg43 fg25"
            data-node-id="6:707"
          >
            THE SPREAD
          </p>
          <p
            className="fg20 fg334 fg30 fg22 fg5 fg12 fg335 fg43 fg25"
            data-node-id="6:708"
          >
            THE ANTHOLOGY
          </p>
          <p
            className="fg20 fg334 fg30 fg22 fg5 fg12 fg335 fg43 fg25"
            data-node-id="6:709"
          >
            GUEST CAPTURES
          </p>
          <div
            className="fg336 fg337 fg5 fg12 fg338"
            data-node-id="6:710"
            data-name="sep"
          />
          <ShareButton className="fg5 fg12 fg339" />
        </div>
      </div>
      <div
        className="fg322 fg253 fg92 fg1 fg2 fg230 fg7 fg40 fg80 fg324 fg340 fg5 fg12 fg24"
        data-node-id="6:713"
        data-name="desktop-hero-spread"
      >
        <div
          className="fg1 fg2 fg3 fg183 fg4 fg5 fg12 fg191"
          data-node-id="6:714"
          data-name="intro-statement"
        >
          <div
            className="fg1 fg2 fg44 fg40 fg5 fg12"
            data-node-id="6:715"
            data-name="eyebrow"
          >
            <div
              className="fg341 fg342 fg5 fg12 fg343"
              data-node-id="6:716"
              data-name="Rectangle"
            />
            <p
              className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg43 fg33 fg25"
              data-node-id="6:717"
            >
              PREMIERE SELECTION
            </p>
          </div>
          <div
            className="fg20 fg1 fg2 fg3 fg34 fg4 fg5 fg12"
            data-node-id="6:718"
            data-name="headline-lockup"
          >
            <div
              className="fg35 fg36 fg31 fg5 fg12 fg328 fg344 fg24"
              data-node-id="6:719"
            >
              <p className="fg178 fg39">{`Amira & Rayhan:`}</p>
              <p className="fg178">Complete Anthology</p>
            </div>
            <p
              className="fg345 fg42 fg204 fg5 fg12 fg335 fg147 fg24"
              data-node-id="6:720"
            >{`An immersive 50-image compilation preserving the glances, the ceremonies, and the late-night celebrations under Dhaka's midnight canopy.`}</p>
          </div>
        </div>
        <div
          className="fg1 fg2 fg62 fg89 fg4 fg63 fg80 fg5 fg269"
          data-node-id="6:728"
          data-name="hero-large-image"
        >
          <div
            className="fg62 fg89 fg63 fg5"
            data-node-id="6:729"
            data-name="Rectangle"
          >
            <img
              alt="Wedding memory"
              tabIndex={0}
              role="button"
              aria-label="Open wedding photograph"
              className="fg14 fg15 fg17 fg18 fg16 fg6"
              src={imgRectangle}
            />
          </div>
          <div
            className="fg14 fg15"
            data-node-id="14:67"
            style={{
              backgroundImage:
                "linear-gradient(222.27368900609375deg, rgba(11, 10, 9, 0) 45%, rgba(11, 10, 9, 0.949) 75%)",
            }}
            data-name="cinematic-overlay"
          />
          <div
            className="fg14 fg1 fg2 fg58 fg4 fg346 fg347"
            data-node-id="14:68"
            data-name="top-actions"
          >
            <PremiereShareButton className="fg5 fg12 fg115" />
            <PremiereDownloadButton className="fg5 fg12 fg348" />
          </div>
          <div
            className="fg20 fg14 fg349 fg1 fg2 fg3 fg260 fg22 fg110 fg25"
            data-node-id="14:84"
            data-name="hero-branding"
          >
            <p
              className="fg326 fg327 fg350 fg5 fg12 fg351 fg65 fg33"
              data-node-id="14:85"
            >
              Premiere Selection
            </p>
            <p className="fg26 fg27 fg5 fg12 fg328 fg147" data-node-id="14:86">
              The Minimal Edit
            </p>
          </div>
        </div>
      </div>
      <div
        className="fg1 fg2 fg3 fg169 fg4 fg352 fg5 fg12 fg24"
        data-node-id="6:730"
        data-name="desktop-act1-highlights"
      >
        <div
          className="fg1 fg2 fg260 fg8 fg5 fg12 fg24"
          data-node-id="6:731"
          data-name="section-title-wrap"
        >
          <div
            className="fg1 fg2 fg3 fg44 fg4 fg5 fg12 fg248"
            data-node-id="6:732"
            data-name="chapter-header"
          >
            <div
              className="fg1 fg2 fg44 fg40 fg5 fg12"
              data-node-id="6:733"
              data-name="act-badge"
            >
              <div
                className="fg341 fg5 fg353 fg12 fg354"
                data-node-id="6:734"
                data-name="dot"
              />
              <p
                className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg32 fg33 fg25"
                data-node-id="6:735"
              >
                ACT I · HIGHLIGHTS
              </p>
            </div>
            <p
              className="fg20 fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg176 fg188"
              data-node-id="6:736"
            >
              The Relived Wedding Day
            </p>
            <p
              className="fg20 fg345 fg42 fg22 fg187 fg5 fg12 fg335 fg43 fg188"
              data-node-id="6:737"
            >
              Explore the opening sequences of the ceremony anthology
            </p>
          </div>
          <p
            className="fg20 fg345 fg42 fg22 fg5 fg12 fg355 fg43 fg25"
            data-node-id="6:738"
          >
            REPRESENTING SCENE 01 - 04
          </p>
        </div>
        <div
          className="fg1 fg2 fg177 fg4 fg5 fg12 fg24"
          data-node-id="6:739"
          data-name="desktop-4-grid"
        >
          <div
            className="fg1 fg2 fg62 fg3 fg58 fg4 fg63 fg5"
            data-node-id="6:740"
            data-name="grid-card"
          >
            <div
              className="fg318 fg5 fg195 fg12 fg24"
              data-node-id="6:741"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg195 fg6"
                src={imgRectangle1}
              />
            </div>
            <div
              className="fg20 fg1 fg2 fg3 fg325 fg4 fg22 fg5 fg12 fg147 fg24 fg25"
              data-node-id="6:742"
              data-name="Frame"
            >
              <p className="fg332 fg333 fg5 fg12 fg328" data-node-id="6:743">
                01. Grand Arrival
              </p>
              <p className="fg26 fg27 fg5 fg12 fg335" data-node-id="6:744">
                The festive lights flicker.
              </p>
            </div>
          </div>
          <div
            className="fg1 fg2 fg62 fg3 fg58 fg4 fg63 fg5"
            data-node-id="6:745"
            data-name="grid-card"
          >
            <div
              className="fg318 fg5 fg195 fg12 fg24"
              data-node-id="6:746"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg195 fg6"
                src={imgRectangle2}
              />
            </div>
            <div
              className="fg20 fg1 fg2 fg3 fg325 fg4 fg22 fg5 fg12 fg147 fg24 fg25"
              data-node-id="6:747"
              data-name="Frame"
            >
              <p className="fg332 fg333 fg5 fg12 fg328" data-node-id="6:748">
                02. Red Veil Lift
              </p>
              <p className="fg26 fg27 fg5 fg12 fg335" data-node-id="6:749">
                Amira steps forward into light.
              </p>
            </div>
          </div>
          <div
            className="fg1 fg2 fg62 fg3 fg58 fg4 fg63 fg5"
            data-node-id="6:750"
            data-name="grid-card"
          >
            <div
              className="fg318 fg5 fg195 fg12 fg24"
              data-node-id="6:751"
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
            <div
              className="fg20 fg1 fg2 fg3 fg325 fg4 fg22 fg5 fg12 fg147 fg24 fg25"
              data-node-id="6:752"
              data-name="Frame"
            >
              <p className="fg332 fg333 fg5 fg12 fg328" data-node-id="6:753">
                03. Unspoken Devotion
              </p>
              <p className="fg26 fg27 fg5 fg12 fg335" data-node-id="6:754">
                Silent vows made in the court.
              </p>
            </div>
          </div>
          <div
            className="fg1 fg2 fg62 fg3 fg58 fg4 fg63 fg5"
            data-node-id="6:755"
            data-name="grid-card"
          >
            <div
              className="fg318 fg5 fg195 fg12 fg24"
              data-node-id="6:756"
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
            <div
              className="fg20 fg1 fg2 fg3 fg325 fg4 fg22 fg5 fg12 fg147 fg24 fg25"
              data-node-id="6:757"
              data-name="Frame"
            >
              <p className="fg332 fg333 fg5 fg12 fg328" data-node-id="6:758">
                04. Quiet Gaze
              </p>
              <p className="fg26 fg27 fg5 fg12 fg335" data-node-id="6:759">
                Moments of peaceful presence.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="fg356 fg1 fg2 fg230 fg40 fg324 fg340 fg5 fg12 fg24"
        data-node-id="6:760"
        data-name="desktop-cinematic-spread"
      >
        <div
          className="fg20 fg1 fg2 fg3 fg177 fg4 fg5 fg12 fg357"
          data-node-id="6:761"
          data-name="content-left"
        >
          <p
            className="fg326 fg327 fg22 fg5 fg12 fg331 fg43 fg25"
            data-node-id="6:762"
          >
            SCENE SPOTLIGHT
          </p>
          <p
            className="fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg226 fg188"
            data-node-id="6:763"
          >{`"Dinner is served under the stars."`}</p>
          <p
            className="fg345 fg42 fg204 fg187 fg5 fg12 fg335 fg147 fg188"
            data-node-id="6:764"
          >{`In Dhaka's crisp December air, family tables were assembled inside the private courtyard, creating an elegant open-air feast designed completely around conversation and memories.`}</p>
          <ImageCaption className="fg1 fg2 fg41 fg42 fg4 fg8 fg22 fg31 fg11 fg5 fg12 fg61 fg13 fg25" />
        </div>
        <div
          className="fg1 fg2 fg62 fg4 fg63 fg5"
          data-node-id="6:768"
          data-name="content-right"
        >
          <LandscapeImage className="fg1 fg2 fg3 fg44 fg4 fg11 fg5 fg12 fg13" />
        </div>
      </div>
      <div
        className="fg1 fg2 fg3 fg169 fg4 fg352 fg5 fg12 fg24"
        data-node-id="6:772"
        data-name="desktop-act2-preparation"
      >
        <div
          className="fg1 fg2 fg3 fg44 fg4 fg5 fg12 fg24"
          data-node-id="6:773"
          data-name="chapter-header"
        >
          <div
            className="fg1 fg2 fg44 fg40 fg5 fg12"
            data-node-id="6:774"
            data-name="act-badge"
          >
            <div
              className="fg341 fg5 fg353 fg12 fg354"
              data-node-id="6:775"
              data-name="dot"
            />
            <p
              className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg32 fg33 fg25"
              data-node-id="6:776"
            >
              ACT II · THE PREPARATION
            </p>
          </div>
          <p
            className="fg20 fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg176 fg188"
            data-node-id="6:777"
          >
            The Delicate Ceremonial Details
          </p>
          <p
            className="fg20 fg345 fg42 fg22 fg187 fg5 fg12 fg335 fg43 fg188"
            data-node-id="6:778"
          >
            Jasmine flowers, traditional textiles, and the final touch of gold
          </p>
        </div>
        <div
          className="fg1 fg2 fg96 fg4 fg5 fg12 fg24"
          data-node-id="6:779"
          data-name="asymmetric-duo"
        >
          <div
            className="fg1 fg2 fg62 fg3 fg34 fg4 fg63 fg5"
            data-node-id="6:780"
            data-name="panel-large"
          >
            <div
              className="fg59 fg5 fg276 fg12 fg24"
              data-node-id="6:781"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg276 fg6"
                src={imgRectangle5}
              />
            </div>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg335 fg180 fg25"
              data-node-id="6:782"
            >
              07. Traditional ornaments selected by the family elders.
            </p>
          </div>
          <div
            className="fg1 fg2 fg3 fg34 fg4 fg5 fg12 fg191"
            data-node-id="6:783"
            data-name="panel-small"
          >
            <div
              className="fg59 fg5 fg276 fg12 fg24"
              data-node-id="6:784"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg276 fg6"
                src={imgRectangle6}
              />
            </div>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg335 fg180 fg25"
              data-node-id="6:785"
            >{`08. Groom's attire complete with handcrafted embroidery.`}</p>
          </div>
        </div>
      </div>
      <div
        className="fg356 fg322 fg92 fg103 fg1 fg2 fg3 fg169 fg4 fg249 fg245 fg324 fg5 fg12 fg24"
        data-node-id="6:786"
        data-name="desktop-guests"
      >
        <div
          className="fg1 fg2 fg3 fg44 fg4 fg5 fg12 fg24"
          data-node-id="6:787"
          data-name="chapter-header"
        >
          <div
            className="fg1 fg2 fg44 fg40 fg5 fg12"
            data-node-id="6:788"
            data-name="act-badge"
          >
            <div
              className="fg341 fg5 fg353 fg12 fg354"
              data-node-id="6:789"
              data-name="dot"
            />
            <p
              className="fg20 fg326 fg327 fg22 fg5 fg12 fg331 fg32 fg33 fg25"
              data-node-id="6:790"
            >
              LIVE ARCHIVE
            </p>
          </div>
          <p
            className="fg20 fg35 fg22 fg187 fg31 fg5 fg12 fg328 fg176 fg188"
            data-node-id="6:791"
          >
            Because You Were There
          </p>
          <p
            className="fg20 fg345 fg42 fg22 fg187 fg5 fg12 fg335 fg43 fg188"
            data-node-id="6:792"
          >
            Genuine captures submitted in real-time by guests celebrating
            together
          </p>
        </div>
        <div
          className="fg1 fg2 fg169 fg4 fg113 fg5 fg12 fg24"
          data-node-id="6:793"
          data-name="guest-avatars-row"
        >
          <div
            className="fg1 fg2 fg3 fg58 fg40 fg5 fg12 fg279"
            data-node-id="6:794"
            data-name="Frame"
          >
            <div
              className="fg358 fg359 fg92 fg5 fg360 fg12 fg361"
              data-node-id="6:795"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg360 fg6"
                src={imgRectangle7}
              />
            </div>
            <p
              className="fg20 fg332 fg333 fg22 fg5 fg12 fg328 fg180 fg25"
              data-node-id="6:796"
            >
              Nadia Rahman
            </p>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg331 fg32 fg25"
              data-node-id="6:797"
            >
              24 PHOTOS
            </p>
          </div>
          <div
            className="fg1 fg2 fg3 fg58 fg40 fg5 fg12 fg279"
            data-node-id="6:798"
            data-name="Frame"
          >
            <div
              className="fg358 fg359 fg92 fg5 fg360 fg12 fg361"
              data-node-id="6:799"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg360 fg6"
                src={imgRectangle8}
              />
            </div>
            <p
              className="fg20 fg332 fg333 fg22 fg5 fg12 fg328 fg180 fg25"
              data-node-id="6:800"
            >{`Farhan's Perspective`}</p>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg331 fg32 fg25"
              data-node-id="6:801"
            >
              12 PHOTOS
            </p>
          </div>
          <div
            className="fg1 fg2 fg3 fg58 fg40 fg5 fg12 fg279"
            data-node-id="6:802"
            data-name="Frame"
          >
            <div
              className="fg358 fg359 fg92 fg5 fg360 fg12 fg361"
              data-node-id="6:803"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg360 fg6"
                src={imgRectangle9}
              />
            </div>
            <p
              className="fg20 fg332 fg333 fg22 fg5 fg12 fg328 fg180 fg25"
              data-node-id="6:804"
            >
              The Eldest Cousins
            </p>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg331 fg32 fg25"
              data-node-id="6:805"
            >
              8 PHOTOS
            </p>
          </div>
          <div
            className="fg1 fg2 fg3 fg58 fg40 fg5 fg12 fg279"
            data-node-id="6:806"
            data-name="Frame"
          >
            <div
              className="fg358 fg359 fg92 fg5 fg360 fg12 fg361"
              data-node-id="6:807"
              data-name="Rectangle"
            >
              <img
                alt="Wedding memory"
                tabIndex={0}
                role="button"
                aria-label="Open wedding photograph"
                className="fg14 fg15 fg17 fg18 fg16 fg360 fg6"
                src={imgRectangle10}
              />
            </div>
            <p
              className="fg20 fg332 fg333 fg22 fg5 fg12 fg328 fg180 fg25"
              data-node-id="6:808"
            >{`Zoya's Side`}</p>
            <p
              className="fg20 fg345 fg42 fg22 fg5 fg12 fg331 fg32 fg25"
              data-node-id="6:809"
            >
              16 PHOTOS
            </p>
          </div>
        </div>
      </div>
      <div
        className="fg321 fg322 fg92 fg103 fg1 fg2 fg3 fg96 fg4 fg324 fg340 fg5 fg12 fg24"
        data-node-id="6:810"
        data-name="desktop-footer"
      >
        <div
          className="fg20 fg1 fg2 fg4 fg8 fg5 fg12 fg24"
          data-node-id="6:811"
          data-name="footer-split"
        >
          <div
            className="fg1 fg2 fg3 fg34 fg4 fg5 fg12 fg191"
            data-node-id="6:812"
            data-name="thanks-column"
          >
            <p
              className="fg26 fg27 fg22 fg5 fg12 fg328 fg28 fg25"
              data-node-id="6:813"
            >
              With Endless Love,
            </p>
            <p
              className="fg326 fg327 fg22 fg5 fg12 fg351 fg329 fg25"
              data-node-id="6:814"
            >{`AMIRA & RAYHAN`}</p>
            <p
              className="fg345 fg42 fg204 fg187 fg5 fg12 fg335 fg43 fg188"
              data-node-id="6:815"
            >
              Our wedding premiere is now complete. Thank you for your warm
              presence, your candid captures, and for celebrating the first day
              of our forever.
            </p>
          </div>
          <div
            className="fg1 fg2 fg3 fg58 fg4 fg22 fg5 fg12 fg32 fg227 fg25"
            data-node-id="6:816"
            data-name="credits-column"
          >
            <p className="fg326 fg327 fg5 fg12 fg331" data-node-id="6:817">
              PRODUCTION CREDITS
            </p>
            <p
              className="fg345 fg42 fg5 fg12 fg335"
              data-node-id="6:818"
            >{`PHOTOGRAPHY — FELLOW GUESTS & NADIA CHOUDHURY`}</p>
            <p className="fg345 fg42 fg5 fg12 fg335" data-node-id="6:819">
              SOUNDSCAPE — TRADITIONAL SHEHNAI ENSEMBLE
            </p>
            <p className="fg345 fg42 fg5 fg12 fg335" data-node-id="6:820">
              VENUE — THE SHANGRI-LA PAVILION, DHAKA
            </p>
          </div>
        </div>
        <div
          className="fg362 fg342 fg5 fg12 fg24"
          data-node-id="6:821"
          data-name="divider"
        />
        <div
          className="fg20 fg1 fg2 fg345 fg42 fg40 fg8 fg22 fg5 fg12 fg65 fg24 fg25"
          data-node-id="6:822"
          data-name="copyright-row"
        >
          <p className="fg5 fg12 fg355" data-node-id="6:823">
            ALL RIGHTS RESERVED © 2026. ORIGINAL COUPLING REGISTERED IN DHAKA.
          </p>
          <p
            className="fg5 fg12 fg331"
            data-node-id="6:824"
          >{`RESTRICTED ACCESS — EXCLUSIVELY LICENSED TO FRIENDS & FAMILY`}</p>
        </div>
      </div>
    </div>
  );
}
