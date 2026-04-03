import { useState } from "react"

import { cn } from "@/lib/utils"

export const NavigationBarDemo = () => {
  const [count, setCount] = useState(0)

  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-lg p-4")}>
      <h1 className="mb-2 text-2xl font-bold">Component Example</h1>
      <h2 className="text-xl font-semibold">{count}</h2>
      <div className="flex gap-2">
        <button onClick={() => setCount((prev) => prev - 1)}>-</button>
        <button onClick={() => setCount((prev) => prev + 1)}>+</button>
      </div>
    </div>
  )
}
