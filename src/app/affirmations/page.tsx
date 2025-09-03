"use client";

import { withAuth } from "@/lib/withAuth";
import React from "react";

function page() {
  return (
    <div className="m-10 mt-25 flex flex-col items-center">
      <div className="max-w-[1500px]">
        <h1 className="text-xl mb-5 text-teal-500 font-bold text-center">
          Daily Affirmations
        </h1>
        <ul className="list-decimal list-inside">
          <li>I&apos;m an excellent manager of my money!</li>
          <li>I always pay myself first!</li>
          <li>Money works hard for me and produces more and more money!</li>
          <li>Everything I do prospers and overwhelms!</li>
          <li>I&apos;m a multimillionaire, prosperous and wealthy!</li>
          <li>
            Everything I spend comes back to me multiplied because I&apos;m the
            source of all wealth!
          </li>
          <li>
            Every day from all points of views, I get better and I become more
            of a multimillionaire!
          </li>
          <li>
            Fortune comes to me! Money grows in my hand like trees grow in the
            fields!
          </li>
          <li>
            I firmly believe that money is important. Money is power and
            freedom. It helps me to be happier and free. I receive it with love
            since God is who sends it to me!
          </li>
          <li>
            I play the game of money to win. My objective is creating
            prosperity, wealth and abundance!
          </li>
        </ul>
      </div>
    </div>
  );
}

export default withAuth(page);
