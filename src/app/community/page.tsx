export default function CommunityPage() {
  return (
    <div className="mt-[100px] flex justify-center">
      <div className="flex gap-[35px] w-full max-w-[1500px] px-5 mt-6 m-10 p-4 ">
        {/* Left box */}
        <div
          className="w-[100%] h-[calc(100vh-200px)] bg-[#16151C] flex flex-col 
            rounded-lg"
        >
          {/* Header bar */}
          <div className="w-full h-20 flex items-center justify-between border-b border-white/20 rounded-t-lg px-5">
            {/* Left: Title */}
            <h2 className="text-white text-2xl">Community</h2>

            {/* Right: Search + circle */}
            <div className="flex items-center gap-4">
              {/* Search bar */}
              <div className="w-full max-w-md">
                <div className="flex items-center bg-[#1c1c22] rounded-lg border border-white/10 px-4 py-2 focus-within:border-white/50 transition duration-200">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="flex-1 bg-transparent text-white placeholder-white/60 outline-none"
                  />
                </div>
              </div>

              {/* Circular button */}
              <div
                className="relative w-11 h-9 rounded-full bg-[#024BC9] backdrop-blur-sm flex items-center justify-center cursor-pointer
                            hover:bg-[#0266FF] "
              >
                <div className="absolute w-1/3 h-[2px] bg-white"></div>
                <div className="absolute h-1/3 w-[2px] bg-white"></div>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-[#737377] text-1xl">There are no posts yet.</h1>
          </div>
        </div>

        {/* Right box */}
        <div
          className="w-[300px] h-[calc(100vh-200px)] bg-[#16151C] flex flex-col 
            rounded-lg  "
        >
          {/* Header bar */}
          <div className="w-full h-20  flex items-center justify-center border-b border-white/20 rounded-t-lg ">
            <h2 className="text-white text-2xl">Filters</h2>
          </div>

          {/* Content area */}
          <div className="flex-1 flex flex-col items-center space-y-2">
            {/* Top row */}
            <div className="flex flex-row items-center justify-center mt-2 gap-3">
              {/* Images box */}
              <div
                className="flex w-[100px] h-[60px] bg-[#1c1c22] items-center justify-center 
                  rounded-lg border border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
              >
                <h1 className="text-white text-center">Images</h1>
              </div>

              {/* Links box */}
              <div
                className="flex w-[100px] h-[60px] bg-[#1c1c22] items-center justify-center 
                  rounded-lg border border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
              >
                <h1 className="text-white text-center">Links</h1>
              </div>
            </div>

            {/* List of posts */}
            <h1
              className="flex w-[90%] h-[60px] bg-[#1c1c22] text-white items-center justify-center text-center
                        rounded-lg border border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
            >
              Posts by Johann
            </h1>
            <h1
              className="flex w-[90%] h-[60px] bg-[#1c1c22] text-white items-center justify-center text-center
                        rounded-lg border border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
            >
              Posts by Marwan
            </h1>
            <h1
              className="flex w-[90%] h-[60px] bg-[#1c1c22] text-white items-center justify-center text-center
                        rounded-lg border border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
            >
              Posts by Bartek
            </h1>
            <h1
              className="flex w-[90%] h-[60px] bg-[#1c1c22] text-white items-center justify-center text-center
                        rounded-lg border border-white/10 cursor-pointer transition duration-100 hover:border-white/60"
            >
              Bookmarks
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
}
