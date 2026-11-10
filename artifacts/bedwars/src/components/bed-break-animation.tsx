export function BedBreakAnimation() {
  return (
    <figure className="bed-break-scene" aria-hidden="true">
      <div className="bed-break-window">
        <svg viewBox="0 0 200 132" role="presentation" shapeRendering="crispEdges">
          <rect width="200" height="132" fill="#0b0809" />
          <rect x="18" y="19" width="4" height="4" fill="#6f171e" />
          <rect x="174" y="28" width="4" height="4" fill="#6f171e" />
          <rect x="25" y="39" width="3" height="3" fill="#48151b" />
          <rect x="163" y="16" width="3" height="3" fill="#48151b" />
          <rect x="20" y="99" width="160" height="14" fill="#1c1113" />
          <rect x="20" y="113" width="160" height="5" fill="#080607" />
          <path d="M20 108H180M52 99V113M84 99V113M116 99V113M148 99V113" stroke="#32171b" strokeWidth="2" />

          <g className="bed-intact">
            <rect x="39" y="57" width="15" height="34" fill="#5c1018" />
            <rect x="54" y="54" width="105" height="34" fill="#a51f2a" />
            <rect x="54" y="54" width="105" height="7" fill="#c52b37" />
            <rect x="61" y="63" width="27" height="17" fill="#d8cdc6" />
            <rect x="89" y="63" width="66" height="17" fill="#9c1b26" />
            <rect x="54" y="81" width="111" height="9" fill="#4b2023" />
            <rect x="63" y="90" width="8" height="9" fill="#241214" />
            <rect x="149" y="90" width="8" height="9" fill="#241214" />
          </g>

          <path className="bed-crack" d="M104 55L97 65L105 69L98 80L108 87M97 65L88 61M105 69L116 64M98 80L88 84" fill="none" stroke="#f0b6ad" strokeWidth="3" />
          <g className="axe-swing">
            <rect x="128" y="20" width="6" height="39" fill="#895530" />
            <rect x="120" y="17" width="18" height="8" fill="#d8cdc6" />
            <rect x="118" y="19" width="5" height="5" fill="#aab2bd" />
            <rect x="136" y="18" width="4" height="6" fill="#aab2bd" />
            <rect x="129" y="29" width="4" height="23" fill="#a86c3d" />
          </g>

          <g>
            <rect className="bed-fragment bed-fragment-one" x="62" y="59" width="7" height="7" fill="#c52b37" />
            <rect className="bed-fragment bed-fragment-two" x="91" y="68" width="6" height="6" fill="#a51f2a" />
            <rect className="bed-fragment bed-fragment-three" x="128" y="61" width="7" height="7" fill="#d8cdc6" />
            <rect className="bed-fragment bed-fragment-four" x="145" y="73" width="6" height="6" fill="#c52b37" />
            <rect className="bed-fragment bed-fragment-five" x="78" y="78" width="5" height="5" fill="#f0b6ad" />
            <rect className="bed-fragment bed-fragment-six" x="114" y="54" width="5" height="5" fill="#8b1b24" />
          </g>
        </svg>
        <span className="bed-break-scanline" />
      </div>
      <figcaption className="bed-break-caption">BED DESTROYED</figcaption>
    </figure>
  );
}
