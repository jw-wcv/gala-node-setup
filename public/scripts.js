const { useState, useEffect } = React;

const NodeManager = () => {
  const [status, setStatus] = useState('Loading...');
  const [details, setDetails] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`http://${window.location.hostname}:8080/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          setStatus('Online');
          setDetails(data.details || 'No additional details available.');
          setIsConfigured(true);
        } else {
          setStatus('Not Configured');
          setIsConfigured(false);
        }
      })
      .catch((err) => {
        setStatus('Offline');
        console.error('Error fetching server status:', err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const configureNode = () => {
    setIsLoading(true);
    fetch(`http://${window.location.hostname}:8080/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          alert('Node configured successfully!');
          setIsConfigured(true);
          setDetails(data.message || 'Node configured.');
        } else {
          alert('Failed to configure node: ' + data.message);
        }
      })
      .catch((err) => {
        alert('Error configuring node.');
        console.error('Error:', err);
      })
      .finally(() => setIsLoading(false));
  };

  const toggleOptionsPanel = () => {
    setIsOptionsVisible(!isOptionsVisible);
  };

  return (
    <div>
      {isLoading && <div className="spinner"></div>}
      <h1>Node Manager</h1>
      <p>Backend Status: {status}</p>
      {isConfigured ? (
        <div>
          <pre>{details}</pre>
          <div className="options-panel">
            <button onClick={toggleOptionsPanel}>
              {isOptionsVisible ? 'Hide Options' : 'Show Options'}
            </button>
            <div className={`options-buttons ${isOptionsVisible ? 'visible' : ''}`}>
              <button disabled>Restart Server</button>
              <button disabled>Rename Server</button>
              <button disabled>SSH Server</button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h3>Enter API Key to Configure Node</h3>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API Key"
          />
          <button onClick={configureNode} disabled={isLoading}>
            Submit API Key
          </button>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<NodeManager />, document.getElementById('root'));
