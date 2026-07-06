import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Eye,
  EyeOff,
  Folder,
  Globe,
  Key,
  ShieldAlert,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { getBackendConfig, submitOnboarding } from "@/lib/scrawn-server"
import { Button } from "@/components/ui/button"

import { authClient } from "@/lib/auth-client"

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      {
        title: "Initialize Gateway — Scrawn Onboarding Console",
      },
      {
        name: "description",
        content:
          "Configure your Scrawn billing gateway. Connect DodoPayments API credentials, product IDs, currency models, and redirection configurations.",
      },
      {
        name: "og:title",
        content: "Initialize Gateway — Scrawn Onboarding Console",
      },
      {
        name: "og:description",
        content:
          "Configure your Scrawn billing gateway. Connect DodoPayments API credentials, product IDs, currency models, and redirection configurations.",
      },
      {
        name: "og:image",
        content: "/og.jpg",
      },
      {
        name: "twitter:title",
        content: "Initialize Gateway — Scrawn Onboarding Console",
      },
      {
        name: "twitter:description",
        content:
          "Configure your Scrawn billing gateway. Connect DodoPayments API credentials, webhook secrets, currency models, and redirection configurations.",
      },
      {
        name: "twitter:image",
        content: "/og.jpg",
      },
    ],
  }),
  component: Onboarding,
})

const stepDetails = [
  {
    tag: "// STEP 01 - PROJECT SETUP",
    title: "PROJECT NAME",
    desc: "Choose a name for your Scrawn project. This is used to identify your project across the dashboard and API.",
  },
  {
    tag: "// STEP 02 - PRODUCTION AUTH",
    title: "LIVE API KEY",
    desc: "Your DodoPayments Live API Key connects Scrawn to the production environment to authenticate secure billing and transaction operations.",
  },
  {
    tag: "// STEP 03 - SANDBOX ENVIRONMENT",
    title: "TEST API KEY",
    desc: "Your DodoPayments Test API Key is used to mock checkout states, run sandbox webhooks, and simulate user pricing upgrades during local development.",
  },
  {
    tag: "// STEP 04 - SETTLEMENT CONFIG",
    title: "BASE CURRENCY",
    desc: "Select the default base currency. All system revenue analytics, metered logs, and usage graphs will process and display values in this currency.",
  },
  {
    tag: "// STEP 05 - REDIRECT GATEWAY",
    title: "REDIRECT URL",
    desc: "The default endpoint URL where customers will be redirected back to after completing checkout or managing their subscriptions.",
  },
]

function Onboarding() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [dodoLiveApiKey, setDodoLiveApiKey] = useState("")
  const [dodoTestApiKey, setDodoTestApiKey] = useState("")
  const [currency, setCurrency] = useState("usd")
  const [redirectUrl, setRedirectUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [showLiveApiKey, setShowLiveApiKey] = useState(false)
  const [showTestApiKey, setShowTestApiKey] = useState(false)
  useEffect(() => {
    if (!session || isPending) return
    getBackendConfig().then((res) => {
      if (res.configured) {
        navigate({ to: "/dashboard", replace: true })
      }
    })
  }, [session, isPending, navigate])

  if (isPending) return null
  if (!session) {
    navigate({ to: "/sign-in", replace: true })
    return null
  }

  const currentDetails = stepDetails[step]

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (step < stepDetails.length - 1) {
      setStep(step + 1)
    } else {
      handleFinalSubmit()
    }
  }

  async function handleFinalSubmit() {
    setLoading(true)
    setError("")
    const res = await submitOnboarding({
      data: {
        name,
        dodoLiveApiKey,
        dodoTestApiKey,
        currency,
        redirectUrl,
      },
    })
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }

    for (let i = 0; i < 10; i++) {
      const config = await getBackendConfig()
      if (config.configured) {
        navigate({ to: "/dashboard", replace: true })
        return
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    navigate({ to: "/dashboard", replace: true })
  }

  return (
    <div className="relative flex min-h-svh flex-col justify-between overflow-x-hidden bg-white text-black selection:bg-yellow-400 selection:text-black dark:bg-black dark:text-white dark:selection:bg-yellow-400 dark:selection:text-black">
      {/* Background blueprint grid overlay */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/potentialbackground.png')] bg-[length:1000px_auto] bg-top opacity-[0.03] md:bg-cover md:bg-center md:bg-no-repeat dark:opacity-[0.06] dark:invert" />

      {/* Decorative Crosshairs */}
      <div className="pointer-events-none absolute top-10 left-10 z-0 hidden font-mono text-xl font-black text-gray-200 md:block dark:text-gray-800">
        +
      </div>
      <div className="pointer-events-none absolute bottom-10 left-10 z-0 hidden font-mono text-xl font-black text-gray-200 md:block dark:text-gray-800">
        +
      </div>

      {/* Main split-screen container */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center gap-12 px-6 py-12 lg:flex-row lg:items-stretch lg:justify-between">
        {/* Left Column: Visual schematic & Step information */}
        <div className="flex w-full flex-col items-start justify-center lg:w-[50%]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-start"
            >
              <div className="mb-4 inline-flex rotate-[-1deg] border-2 border-black bg-yellow-400 px-3 py-1 font-mono text-xs font-black tracking-widest text-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-yellow-500">
                {currentDetails.tag}
              </div>

              <h1 className="font-mono text-5xl leading-[0.9] font-black tracking-tighter text-black uppercase sm:text-6xl xl:text-7xl dark:text-white">
                {currentDetails.title.split(" ").slice(0, -1).join(" ")} <br />
                <span className="text-[#ff00ff]">
                  {currentDetails.title.split(" ").slice(-1)[0]}
                </span>
              </h1>

              <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {currentDetails.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Column: Setup Form Card */}
        <div className="relative flex w-full max-w-md flex-col items-center justify-center lg:w-[45%]">
          {/* Stacked background offset card */}
          <div className="absolute top-3 -right-3 bottom-3 left-3 border-2 border-black bg-neutral-100 dark:border-white dark:bg-neutral-900" />

          {/* Foreground Form Card */}
          <div className="relative z-10 w-full border-2 border-black bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="mb-4 border-2 border-black bg-yellow-50 px-4 py-3 font-mono text-xs leading-relaxed font-bold text-black dark:border-white dark:bg-yellow-500/10 dark:text-white">
              Need help setting up your Dodo Payments keys?{" "}
              <a
                href="https://docs.scrawn.dev/dashboard-setup"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[#ff00ff] dark:hover:text-[#ff00ff]"
              >
                Read the docs →
              </a>
            </div>

            <form
              key="wizard-form"
              onSubmit={handleNext}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between font-mono text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                  <span>Configuration Progress</span>
                  <span>
                    Step {step + 1} of {stepDetails.length}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden border-2 border-black bg-neutral-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:border-white dark:bg-black dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <motion.div
                    className="h-full border-r-2 border-black bg-[#ff00ff] dark:border-white"
                    animate={{
                      width: `${((step + 1) / stepDetails.length) * 100}%`,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  />
                </div>
              </div>

              {/* Conditional Active Step Inputs */}
              <div className="flex min-h-[120px] flex-col justify-center">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-1.5"
                    >
                      <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                        Project Name
                      </label>
                      <div className="relative flex items-center">
                        <Folder className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="My Scrawn Project"
                          required
                          className="w-full border-2 border-black bg-white py-2.5 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                        />
                      </div>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-1.5"
                    >
                      <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                        Dodo Live API Key
                      </label>
                      <div className="relative flex items-center">
                        <Key className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                        <input
                          type={showLiveApiKey ? "text" : "password"}
                          value={dodoLiveApiKey}
                          onChange={(e) => setDodoLiveApiKey(e.target.value)}
                          placeholder="XCmeKyWvG1-TTc3w.UZwYsW1fCkxnnMc5N-3GT70L-qBXZ26BwdnmBp3T9Hf3GLz5"
                          required
                          className="w-full border-2 border-black bg-white py-2.5 pr-10 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLiveApiKey(!showLiveApiKey)}
                          className="absolute right-3 cursor-pointer text-neutral-400 hover:text-black dark:hover:text-white"
                        >
                          {showLiveApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-1.5"
                    >
                      <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                        Dodo Test API Key
                      </label>
                      <div className="relative flex items-center">
                        <Key className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                        <input
                          type={showTestApiKey ? "text" : "password"}
                          value={dodoTestApiKey}
                          onChange={(e) => setDodoTestApiKey(e.target.value)}
                          placeholder="XCmeKyWvG1-TTc3w.UZwYsW1fCkxnnMc5N-3GT70L-qBXZ26BwdnmBp3T9Hf3GLz5"
                          required
                          className="w-full border-2 border-black bg-white py-2.5 pr-10 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTestApiKey(!showTestApiKey)}
                          className="absolute right-3 cursor-pointer text-neutral-400 hover:text-black dark:hover:text-white"
                        >
                          {showTestApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-1.5"
                    >
                      <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                        Currency
                      </label>
                      <div className="relative flex items-center">
                        <Coins className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full border-2 border-black bg-white py-2.5 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] dark:border-white dark:bg-black dark:text-white"
                        >
                          <option value="usd">USD</option>
                          <option value="eur">EUR</option>
                          <option value="gbp">GBP</option>
                          <option value="inr">INR</option>
                          <option value="jpy">JPY</option>
                        </select>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-1.5"
                    >
                      <label className="font-mono text-xs font-bold tracking-wider text-neutral-600 uppercase dark:text-neutral-400">
                        Redirect URL
                      </label>
                      <div className="relative flex items-center">
                        <Globe className="pointer-events-none absolute left-3 h-4 w-4 text-neutral-400" />
                        <input
                          type="url"
                          value={redirectUrl}
                          onChange={(e) => setRedirectUrl(e.target.value)}
                          placeholder="https://app.scrawn.dev"
                          required
                          className="w-full border-2 border-black bg-white py-2.5 pr-4 pl-10 font-mono text-sm text-black transition-all outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:bg-yellow-50/10 dark:border-white dark:bg-black dark:text-white dark:focus:bg-zinc-950"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 border border-red-500 bg-red-50 p-3 dark:bg-red-950/20">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                    Error: {error}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(step - 1)}
                    disabled={loading}
                    className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center border-2 border-black dark:border-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading}
                  variant="fuchsia"
                  className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-black font-mono text-sm font-black tracking-widest uppercase dark:border-white"
                >
                  {loading ? (
                    "Processing..."
                  ) : step < 4 ? (
                    <>
                      Continue <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Complete Setup <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Empty space matching height at bottom */}
      <div className="shrink-0 py-6" />
    </div>
  )
}
