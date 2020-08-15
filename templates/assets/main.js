const SPACE = 32
const BACKSPACE = 8
const CANCELLED = [ 13, 33, 34, 35, 36, 37, 38, 39, 40]
const IGNORED = [ 16, 17, 18, 37, 91, 93, 225 ]

class WordManager {
  constructor(dictionary, render_text) {
    this.dictionary = dictionary || [ 'foo', 'bar' ]
    this.render_text = render_text || "render-text"

    this.wordcount = 0
    this.raw_charcount = 0
    this.charcount = 0
    this.seconds = 0
    this.errors = 0
    this.character_length = 45

    this.words = []
    this.shouldScroll = false
    this.interval_timer = null

    this.started = false
  }

  pickWords () {
    this.words = []
    for (let i = 0; i < 300; i++) {
      this.words.push(this.dictionary[Math.floor(Math.random() * this.dictionary.length)])
    }

    this.letters = this.words.join(" ")
  }

  render() {
    let input_el = document.getElementById(this.render_text)
    input_el.setAttribute('style', '--scroll:0')
    input_el.innerText = ''
    this.words.forEach((w, i) => {
      const wordEl = document.createElement('span')
      wordEl.className = 'word'
      w.split('').forEach((c, j) => {
        const charEl = document.createElement('span')
        charEl.className = 'char'
        charEl.innerText = c
        wordEl.appendChild(charEl)
      })
      input_el.appendChild(wordEl)
    })
    document.querySelector('.word').classList.add('current')
  }

  maybeScroll(prev, next) {
    if (prev.getBoundingClientRect().y !== next.getBoundingClientRect().y) {
      const container = document.getElementById(this.render_text)
      const back = prev.getBoundingClientRect().y > next.getBoundingClientRect().y
      const currentScroll = parseInt(container.getAttribute('style').split(':')[1])

      if (currentScroll === 0) {
        if (!back && !this.shouldScroll) {
          this.shouldScroll = true
          return
        }

        if (back) {
          return
        }
      }

      container.setAttribute('style', `--scroll:${currentScroll + (back ? -1 : 1)}`)
    }
  }

  hasFinishedWord () {
    return !!document.querySelector('.current .char:not(.alizarin-text):not(.emerald-text)')
  }

  start() {
    this.interval_timer = setInterval(() => {
      this.seconds++
      document.getElementById("seconds").innerText = 60 - this.seconds
      document.getElementById("wpm").innerText = Math.round(this.wordcount / (this.seconds / 60))
      document.getElementById("cpm").innerText = Math.round(this.charcount / (this.seconds / 60))

      console.log(this.seconds)
      console.log(this.wordcount)
      if (this.seconds >= 60) this.maybeStop()
    }, 1000) 
  }

  maybeStop() {
    if (!this.hasFinishedWord()) {
      document.getElementById("seconds").innerText = window.TranslationData.FINISH_WORD
      this.pendingStop = true
    } else {
      this.stop()
    }
  }

  stop() {
    clearInterval(this.interval_timer)
    document.getElementById("seconds").innerText = '0'
    this.pendingStop = false
    this.started = false
  }

  reset() {
    this.stop()
    this.wordcount = 0
    this.raw_charcount = 0
    this.charcount = 0
    this.seconds = 0
    this.errors = 0

    this.letters = null
    this.interval_timer = null

    this.index = 0
    this.started = false
    this.pendingStop = false

    document.getElementById(this.render_text).innerText = ""
    document.getElementById("your-attempt").value = ""
    document.getElementById("seconds").innerText = 60
    document.getElementById("wpm").innerText = 0
    document.getElementById("errors").innerText = 0

    this.pickWords()
    this.render()
  }

  keydown(event) {
    if (this.seconds >= 60 && !this.pendingStop) return

    if (!this.started) {
      this.start()
      this.started = true
      document.getElementById("start-text").style.display = "none"
      console.log("Started")
    }

    const pressed = event.which || event.key_code
    console.log(pressed)
    if (CANCELLED.includes(pressed) || (event.ctrlKey && pressed === 65)) {
      event.preventDefault()
      return
    }
    if (IGNORED.includes(pressed)) {
      return
    }

    const currentWord = document.querySelector('.current')
    switch (pressed) {
      case SPACE:
        if (event.target.value[event.target.value.length - 1] === ' ') {
          console.log('Ignoring double space')
          event.preventDefault()
          return
        }

        this.wordcount++

        // Mark remaining of current word as error'd
        currentWord.querySelectorAll('.char:not(.alizarin-text):not(.emerald-text)').forEach(char => {
          char.classList.add('alizarin-text')
          this.errors++
        })

        // Mark next word as current
        currentWord.classList.remove('current')
        currentWord.nextElementSibling.classList.add('current')
        this.maybeScroll(currentWord, currentWord.nextElementSibling)
        break
      case BACKSPACE:
        if (event.target.value[event.target.value.length - 1] === ' ') {
          currentWord.classList.remove('current')
          currentWord.previousElementSibling.classList.add('current')
          this.maybeScroll(currentWord, currentWord.previousElementSibling)
          this.wordcount--
          if (!event.ctrlKey) break
        }
        let toRemove = [ ...document.querySelectorAll('.current .char.alizarin-text, .current .char.emerald-text') ]
        if (!event.ctrlKey) {
          // Make sure we're not in a dumb offset
          if (event.target.value.split(' ').pop().length > toRemove.length) {
            this.errors--
            break
          }
          toRemove = toRemove.slice(toRemove.length - 1)
        }
        toRemove.forEach(char => {
          this.raw_charcount--
          if (char.classList.contains('emerald-text')) {
            char.classList.remove('emerald-text')
            this.charcount--
          } else {
            char.classList.remove('alizarin-text')
            this.errors--
          }
        })
        break
      default:
        const typed = String.fromCharCode(pressed).toLowerCase()
        const typingFor = document.querySelector('.current .char:not(.alizarin-text):not(.emerald-text)')

        this.raw_charcount++
        if (!typingFor) {
          this.errors++
        } else if (typingFor.innerText === typed) {
          typingFor.classList.add('emerald-text')
          this.charcount++
        } else {
          typingFor.classList.add('alizarin-text')
          this.errors++
        }

        if (this.pendingStop && this.hasFinishedWord) this.stop()
        break
    }

    let errors_el = document.getElementById("errors")
    errors_el.innerText = this.errors

    let green = 255 - (this.errors * 5)
    errors_el.style.color = `rgb(255, ${green}, 0)`
  }
}
