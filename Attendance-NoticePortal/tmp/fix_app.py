import os

path = '/app/applet/src/App.tsx'
if not os.path.exists(path):
    path = 'src/App.tsx'

print(f"Working on {path}")

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match the first useEffect which is now corrupted
start_marker = 'useEffect(() => {'
start_idx = content.find(start_marker)

# Find the end of handleLogout
end_marker = 'localStorage.removeItem(\'portal_logged_in_user\');'
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Find the next closing }; after end_idx
    final_end_idx = content.find('};', end_idx) + 2
    # But wait, there might be setLoginError calls etc.
    # Let's search for the first }; that closes handleLogout
    # Actually I can just look for "// --- PROFILE LOGIC HANDLERS ---" which is usually after
    after_logout = content.find('// --- PROFILE LOGIC HANDLERS ---')
    if after_logout != -1:
        final_end_idx = after_logout
    
    new_code = """  useEffect(() => {
    fetch('/api/logo')
      .then(res => res.json())
      .then(data => setFetchedLogo(data.logo))
      .catch(err => console.error("Logo fetch error", err));
  }, []);

  const isSeeding = React.useRef(false);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          usersData,
          reportsData,
          noticesData,
          campusesData,
          profileReqs,
          editReqs,
          leaveReqs,
          emailsData,
          feedbacksData
        ] = await Promise.all([
          api.users.getAll(),
          api.reports.getAll(),
          api.notices.getAll(),
          api.campuses.getAll(),
          api.requests.profile.getAll(),
          api.requests.edit.getAll(),
          api.requests.leave.getAll(),
          api.emails.getAll(),
          api.feedbacks.getAll()
        ]);

        // If database is empty, seed from mock data
        if (usersData.length === 0 && campusesData.length === 0 && !isSeeding.current) {
          isSeeding.current = true;
          console.log("Database empty, seeding...");
          await api.seed({
            managers: MOCK_MANAGERS,
            mentors: MOCK_MENTORS,
            members: MOCK_MEMBERS,
            reports: MOCK_REPORTS,
            notices: MOCK_NOTICES,
            campuses: MOCK_CAMPUSES
          });
          // Re-fetch after seed
          window.location.reload();
          return;
        }

        setMembers(usersData.filter((u: any) => u.role === 'member'));
        setMentors(usersData.filter((u: any) => u.role === 'mentor'));
        setManagers(usersData.filter((u: any) => u.role === 'manager'));
        setReports(reportsData);
        setNotices(noticesData);
        setCampuses(campusesData);
        setProfileRequests(profileReqs);
        setAttendanceEditRequests(editReqs);
        setLeaveRequests(leaveReqs);
        setEmails(emailsData);
        setFeedbacks(feedbacksData);

        // Check logged in user from local storage (just for session, data is in DB)
        const savedUser = localStorage.getItem('portal_logged_in_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          // Refresh user data from DB
          const currentUser = usersData.find((u: any) => u.pin === parsed.pin) || MOCK_MANAGERS.find(m => m.pin === parsed.pin);
          if (currentUser) {
            setLoggedInUser({ ...currentUser, role: parsed.role });
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        const errorMessage = err.message || "Failed to connect to database!";
        if (errorMessage !== "Unknown error") {
          toast.error(errorMessage, { duration: 6000 });
        }
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('portal_logged_in_user');
  };

  """
    new_content = content[:start_idx] + new_code + content[final_end_idx:]
    
    # Replace login route
    login_route_start = '<Route path="/login" element={'
    login_route_end = '<Route path="/*" element={'
    
    route_start_idx = new_content.find(login_route_start)
    route_end_idx = new_content.find(login_route_end)
    
    if route_start_idx != -1 and route_end_idx != -1:
        login_component = \"\"\"<Route path="/login" element={
            !loggedInUser ? (
              <LoginPage onLoginSuccess={(user) => {
                setLoggedInUser(user);
                localStorage.setItem('portal_logged_in_user', JSON.stringify(user));
              }} />
            ) : (
              <Navigate to="/" replace />
            )
          } />
          \"\"\"
        new_content = new_content[:route_start_idx] + login_component + new_content[route_end_idx:]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully fixed App.tsx")
    else:
        print(f"Could not find login route markers: {route_start_idx}, {route_end_idx}")
else:
    print(f"Could not find start ({start_idx}) or end ({end_idx}) markers")
