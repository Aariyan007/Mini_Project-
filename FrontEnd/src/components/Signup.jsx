// import React, { useState } from 'react'
import { GalleryVerticalEnd } from 'lucide-react'
import SignupForm from './Signupcss'

export default function Signup() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-0.5">
        <div className="flex justify-center gap-2 md:justify-start">
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
    </div>
  );
}