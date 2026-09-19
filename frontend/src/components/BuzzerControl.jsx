function BuzzerControl({ enabled, onEnable, latestStatus }) {
  const shouldWarn = latestStatus === 'DANGER' || latestStatus === 'FIRE DETECTED';

  return (
    <section className={`buzzer-panel ${shouldWarn ? 'armed' : ''}`}>
      <div>
        <p className="eyebrow">Web Alert Sound</p>
        <h2>{enabled ? 'Buzzer Sound Enabled' : 'Enable Alert Sound'}</h2>
        <p>
          {enabled
            ? 'The browser will play a short buzzer sound when danger or fire is detected.'
            : 'Click once so the browser allows the audio alarm sound.'}
        </p>
      </div>
      <button type="button" onClick={onEnable} disabled={enabled}>
        {enabled ? 'Sound Ready' : 'Enable Sound'}
      </button>
    </section>
  );
}

export default BuzzerControl;
