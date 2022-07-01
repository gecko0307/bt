var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { stylesheet } = info;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                info.rules = {};
            });
            managed_styles.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = (program.b - t);
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.47.0' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\Tabs.svelte generated by Svelte v3.47.0 */
    const file$5 = "src\\Tabs.svelte";

    function create_fragment$5(ctx) {
    	let main;
    	let div4;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;
    	let t5;
    	let div3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div4 = element("div");
    			div0 = element("div");
    			div0.textContent = "🛠️";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "📷";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "📦";
    			t5 = space();
    			div3 = element("div");
    			div3.textContent = "📡";
    			attr_dev(div0, "class", "tab svelte-1thg375");
    			attr_dev(div0, "data-name", "tools");
    			attr_dev(div0, "title", "Tools");
    			toggle_class(div0, "active", /*currentTab*/ ctx[0] === 'tools');
    			add_location(div0, file$5, 16, 2, 336);
    			attr_dev(div1, "class", "tab svelte-1thg375");
    			attr_dev(div1, "data-name", "capturer");
    			attr_dev(div1, "title", "Capturer");
    			toggle_class(div1, "active", /*currentTab*/ ctx[0] === 'capturer');
    			add_location(div1, file$5, 17, 2, 458);
    			attr_dev(div2, "class", "tab svelte-1thg375");
    			attr_dev(div2, "data-name", "builder");
    			attr_dev(div2, "title", "Builder");
    			toggle_class(div2, "active", /*currentTab*/ ctx[0] === 'builder');
    			add_location(div2, file$5, 18, 2, 588);
    			attr_dev(div3, "class", "tab svelte-1thg375");
    			attr_dev(div3, "data-name", "events");
    			attr_dev(div3, "title", "Events & messages");
    			toggle_class(div3, "active", /*currentTab*/ ctx[0] === 'events');
    			add_location(div3, file$5, 19, 2, 715);
    			attr_dev(div4, "class", "tabs svelte-1thg375");
    			add_location(div4, file$5, 15, 1, 314);
    			attr_dev(main, "class", "svelte-1thg375");
    			add_location(main, file$5, 14, 0, 305);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div4);
    			append_dev(div4, div0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div4, t5);
    			append_dev(div4, div3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "click", /*tabClick*/ ctx[1], false, false, false),
    					listen_dev(div1, "click", /*tabClick*/ ctx[1], false, false, false),
    					listen_dev(div2, "click", /*tabClick*/ ctx[1], false, false, false),
    					listen_dev(div3, "click", /*tabClick*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div0, "active", /*currentTab*/ ctx[0] === 'tools');
    			}

    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div1, "active", /*currentTab*/ ctx[0] === 'capturer');
    			}

    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div2, "active", /*currentTab*/ ctx[0] === 'builder');
    			}

    			if (dirty & /*currentTab*/ 1) {
    				toggle_class(div3, "active", /*currentTab*/ ctx[0] === 'events');
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tabs', slots, []);
    	const dispatch = createEventDispatcher();
    	let currentTab = "tools";

    	function tabClick(event) {
    		const tabName = this.getAttribute("data-name");
    		$$invalidate(0, currentTab = tabName);
    		dispatch("change", { tab: currentTab });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tabs> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		currentTab,
    		tabClick
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentTab' in $$props) $$invalidate(0, currentTab = $$props.currentTab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentTab, tabClick];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\Tools.svelte generated by Svelte v3.47.0 */
    const file$4 = "src\\Tools.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let div1;
    	let fieldset0;
    	let legend0;
    	let t1;
    	let div0;
    	let span0;
    	let t3;
    	let span1;
    	let t5;
    	let div2;
    	let fieldset1;
    	let legend1;
    	let t7;
    	let input0;
    	let t8;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div1 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Timer";
    			t1 = space();
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "00";
    			t3 = text(":");
    			span1 = element("span");
    			span1.textContent = "00";
    			t5 = space();
    			div2 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Tools";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			input1 = element("input");
    			add_location(legend0, file$4, 51, 3, 1142);
    			attr_dev(span0, "id", "sec");
    			add_location(span0, file$4, 52, 19, 1185);
    			attr_dev(span1, "id", "msec");
    			attr_dev(span1, "class", "svelte-3qzh4n");
    			add_location(span1, file$4, 52, 60, 1226);
    			attr_dev(div0, "id", "timer");
    			attr_dev(div0, "class", "svelte-3qzh4n");
    			add_location(div0, file$4, 52, 3, 1169);
    			add_location(fieldset0, file$4, 50, 2, 1127);
    			attr_dev(div1, "class", "section svelte-3qzh4n");
    			add_location(div1, file$4, 49, 1, 1102);
    			add_location(legend1, file$4, 57, 3, 1341);
    			attr_dev(input0, "type", "button");
    			input0.value = "🖼️ Images";
    			attr_dev(input0, "title", "Image Optimizer");
    			add_location(input0, file$4, 58, 3, 1368);
    			attr_dev(input1, "type", "button");
    			input1.value = "🗛 Fonts";
    			attr_dev(input1, "title", "Web Font Generator");
    			add_location(input1, file$4, 59, 3, 1474);
    			add_location(fieldset1, file$4, 56, 2, 1326);
    			attr_dev(div2, "class", "section svelte-3qzh4n");
    			add_location(div2, file$4, 55, 1, 1301);
    			attr_dev(main, "class", "svelte-3qzh4n");
    			add_location(main, file$4, 48, 0, 1093);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(fieldset0, t1);
    			append_dev(fieldset0, div0);
    			append_dev(div0, span0);
    			/*span0_binding*/ ctx[1](span0);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			/*span1_binding*/ ctx[2](span1);
    			append_dev(main, t5);
    			append_dev(main, div2);
    			append_dev(div2, fieldset1);
    			append_dev(fieldset1, legend1);
    			append_dev(fieldset1, t7);
    			append_dev(fieldset1, input0);
    			append_dev(fieldset1, t8);
    			append_dev(fieldset1, input1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "click", /*click_handler*/ ctx[3], false, false, false),
    					listen_dev(input1, "click", /*click_handler_1*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*span0_binding*/ ctx[1](null);
    			/*span1_binding*/ ctx[2](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let sec;
    let msec;
    let timerId = null;
    let period = 10; // milliseconds
    let startTime = Date.now();

    function timerStart() {
    	if (timerId != null) clearInterval(timerId);
    	startTime = Date.now();

    	timerId = setInterval(
    		function tick() {
    			var elapsedTime = Date.now() - startTime;
    			var time = (elapsedTime / 1000).toFixed(3);

    			if (time >= 30) {
    				time = 30;
    			}

    			if (sec && msec) {
    				var integer = Math.floor(time);
    				sec.innerHTML = pad(integer, 2);
    				var decimal = Math.floor((time % 1).toFixed(2) * 100);
    				if (decimal > 99) decimal = 99;
    				msec.innerHTML = pad(decimal, 2);
    			}
    		},
    		period
    	);
    }

    function pad(n, size) {
    	var s = String(n);

    	while (s.length < (size || 2)) {
    		s = "0" + s;
    	}

    	return s;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tools', slots, []);
    	const dispatch = createEventDispatcher();

    	onMount(async () => {
    		timerStart();
    	});

    	function openURL(url) {
    		//window.location.href = url;
    		dispatch("open", { url });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tools> was created with unknown prop '${key}'`);
    	});

    	function span0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			sec = $$value;
    		});
    	}

    	function span1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			msec = $$value;
    		});
    	}

    	const click_handler = () => openURL("/images");
    	const click_handler_1 = () => openURL("/fonts");

    	$$self.$capture_state = () => ({
    		sec,
    		msec,
    		timerId,
    		period,
    		startTime,
    		timerStart,
    		pad,
    		onMount,
    		createEventDispatcher,
    		dispatch,
    		openURL
    	});

    	return [openURL, span0_binding, span1_binding, click_handler, click_handler_1];
    }

    class Tools extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tools",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\Capturer.svelte generated by Svelte v3.47.0 */
    const file$3 = "src\\Capturer.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let div0;
    	let fieldset0;
    	let legend0;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let select0;
    	let option0;
    	let option1;
    	let t6;
    	let p2;
    	let input0;
    	let t7;
    	let div1;
    	let fieldset1;
    	let legend1;
    	let t9;
    	let p3;
    	let t11;
    	let p4;
    	let select1;
    	let option2;
    	let option3;
    	let t14;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Fallback";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Size";
    			t3 = space();
    			p1 = element("p");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "From banner";
    			option1 = element("option");
    			option1.textContent = "From container";
    			t6 = space();
    			p2 = element("p");
    			input0 = element("input");
    			t7 = space();
    			div1 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Video";
    			t9 = space();
    			p3 = element("p");
    			p3.textContent = "Size";
    			t11 = space();
    			p4 = element("p");
    			select1 = element("select");
    			option2 = element("option");
    			option2.textContent = "From banner";
    			option3 = element("option");
    			option3.textContent = "From container";
    			t14 = space();
    			input1 = element("input");
    			add_location(legend0, file$3, 66, 3, 1380);
    			add_location(p0, file$3, 67, 3, 1410);
    			option0.__value = "banner";
    			option0.value = option0.__value;
    			option0.selected = true;
    			add_location(option0, file$3, 70, 5, 1480);
    			option1.__value = "container";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 71, 5, 1539);
    			attr_dev(select0, "class", "svelte-1bjsd88");
    			if (/*fallbackSizeMode*/ ctx[0] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[8].call(select0));
    			add_location(select0, file$3, 69, 4, 1435);
    			add_location(p1, file$3, 68, 3, 1426);
    			attr_dev(input0, "type", "button");
    			input0.value = "📷 Capture Fallback";
    			attr_dev(input0, "title", "Capture fallback");
    			add_location(input0, file$3, 74, 6, 1620);
    			add_location(p2, file$3, 74, 3, 1617);
    			add_location(fieldset0, file$3, 65, 2, 1365);
    			attr_dev(div0, "class", "section svelte-1bjsd88");
    			add_location(div0, file$3, 64, 1, 1340);
    			add_location(legend1, file$3, 79, 3, 1793);
    			add_location(p3, file$3, 80, 3, 1820);
    			option2.__value = "banner";
    			option2.value = option2.__value;
    			option2.selected = true;
    			add_location(option2, file$3, 83, 5, 1887);
    			option3.__value = "container";
    			option3.value = option3.__value;
    			add_location(option3, file$3, 84, 5, 1946);
    			attr_dev(select1, "class", "svelte-1bjsd88");
    			if (/*videoSizeMode*/ ctx[1] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[9].call(select1));
    			add_location(select1, file$3, 82, 4, 1845);
    			add_location(p4, file$3, 81, 3, 1836);
    			attr_dev(input1, "type", "button");
    			input1.value = "🎥 Capture Video";
    			attr_dev(input1, "title", "Capture video");
    			add_location(input1, file$3, 87, 3, 2024);
    			add_location(fieldset1, file$3, 78, 2, 1778);
    			attr_dev(div1, "class", "section svelte-1bjsd88");
    			add_location(div1, file$3, 77, 1, 1753);
    			attr_dev(main, "class", "svelte-1bjsd88");
    			add_location(main, file$3, 63, 0, 1331);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(fieldset0, t1);
    			append_dev(fieldset0, p0);
    			append_dev(fieldset0, t3);
    			append_dev(fieldset0, p1);
    			append_dev(p1, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			select_option(select0, /*fallbackSizeMode*/ ctx[0]);
    			append_dev(fieldset0, t6);
    			append_dev(fieldset0, p2);
    			append_dev(p2, input0);
    			append_dev(main, t7);
    			append_dev(main, div1);
    			append_dev(div1, fieldset1);
    			append_dev(fieldset1, legend1);
    			append_dev(fieldset1, t9);
    			append_dev(fieldset1, p3);
    			append_dev(fieldset1, t11);
    			append_dev(fieldset1, p4);
    			append_dev(p4, select1);
    			append_dev(select1, option2);
    			append_dev(select1, option3);
    			select_option(select1, /*videoSizeMode*/ ctx[1]);
    			append_dev(fieldset1, t14);
    			append_dev(fieldset1, input1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[8]),
    					listen_dev(input0, "click", /*captureFallback*/ ctx[2], false, false, false),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[9]),
    					listen_dev(input1, "click", /*captureVideo*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fallbackSizeMode*/ 1) {
    				select_option(select0, /*fallbackSizeMode*/ ctx[0]);
    			}

    			if (dirty & /*videoSizeMode*/ 2) {
    				select_option(select1, /*videoSizeMode*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function apiRequest$2(data) {
    	const res = await fetch("/api", {
    		method: "POST",
    		body: JSON.stringify(data)
    	});

    	return await res.json();
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Capturer', slots, []);
    	const dispatch = createEventDispatcher();
    	let { bannerWidth } = $$props;
    	let { bannerHeight } = $$props;
    	let { containerWidth } = $$props;
    	let { containerHeight } = $$props;
    	let fallbackSizeMode = "banner";
    	let videoSizeMode = "banner";

    	async function captureFallback() {
    		let width, height;

    		if (fallbackSizeMode === "banner") {
    			width = bannerWidth;
    			height = bannerHeight;
    		} else if (fallbackSizeMode === "container") {
    			width = containerWidth;
    			height = containerHeight;
    		}

    		await apiRequest$2({ method: "capture", width, height });
    	}

    	async function captureVideo() {
    		let width, height;

    		if (videoSizeMode === "banner") {
    			width = bannerWidth;
    			height = bannerHeight;
    		} else if (videoSizeMode === "container") {
    			width = containerWidth;
    			height = containerHeight;
    		}

    		await apiRequest$2({
    			method: "capture",
    			video: true,
    			width,
    			height,
    			fps: 60,
    			videoFilename: "video.mp4",
    			videoCompressionRate: 1,
    			videoDuration: undefined
    		});
    	}

    	const writable_props = ['bannerWidth', 'bannerHeight', 'containerWidth', 'containerHeight'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Capturer> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		fallbackSizeMode = select_value(this);
    		$$invalidate(0, fallbackSizeMode);
    	}

    	function select1_change_handler() {
    		videoSizeMode = select_value(this);
    		$$invalidate(1, videoSizeMode);
    	}

    	$$self.$$set = $$props => {
    		if ('bannerWidth' in $$props) $$invalidate(4, bannerWidth = $$props.bannerWidth);
    		if ('bannerHeight' in $$props) $$invalidate(5, bannerHeight = $$props.bannerHeight);
    		if ('containerWidth' in $$props) $$invalidate(6, containerWidth = $$props.containerWidth);
    		if ('containerHeight' in $$props) $$invalidate(7, containerHeight = $$props.containerHeight);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		bannerWidth,
    		bannerHeight,
    		containerWidth,
    		containerHeight,
    		fallbackSizeMode,
    		videoSizeMode,
    		apiRequest: apiRequest$2,
    		captureFallback,
    		captureVideo
    	});

    	$$self.$inject_state = $$props => {
    		if ('bannerWidth' in $$props) $$invalidate(4, bannerWidth = $$props.bannerWidth);
    		if ('bannerHeight' in $$props) $$invalidate(5, bannerHeight = $$props.bannerHeight);
    		if ('containerWidth' in $$props) $$invalidate(6, containerWidth = $$props.containerWidth);
    		if ('containerHeight' in $$props) $$invalidate(7, containerHeight = $$props.containerHeight);
    		if ('fallbackSizeMode' in $$props) $$invalidate(0, fallbackSizeMode = $$props.fallbackSizeMode);
    		if ('videoSizeMode' in $$props) $$invalidate(1, videoSizeMode = $$props.videoSizeMode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		fallbackSizeMode,
    		videoSizeMode,
    		captureFallback,
    		captureVideo,
    		bannerWidth,
    		bannerHeight,
    		containerWidth,
    		containerHeight,
    		select0_change_handler,
    		select1_change_handler
    	];
    }

    class Capturer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			bannerWidth: 4,
    			bannerHeight: 5,
    			containerWidth: 6,
    			containerHeight: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Capturer",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*bannerWidth*/ ctx[4] === undefined && !('bannerWidth' in props)) {
    			console.warn("<Capturer> was created without expected prop 'bannerWidth'");
    		}

    		if (/*bannerHeight*/ ctx[5] === undefined && !('bannerHeight' in props)) {
    			console.warn("<Capturer> was created without expected prop 'bannerHeight'");
    		}

    		if (/*containerWidth*/ ctx[6] === undefined && !('containerWidth' in props)) {
    			console.warn("<Capturer> was created without expected prop 'containerWidth'");
    		}

    		if (/*containerHeight*/ ctx[7] === undefined && !('containerHeight' in props)) {
    			console.warn("<Capturer> was created without expected prop 'containerHeight'");
    		}
    	}

    	get bannerWidth() {
    		throw new Error("<Capturer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bannerWidth(value) {
    		throw new Error("<Capturer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bannerHeight() {
    		throw new Error("<Capturer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bannerHeight(value) {
    		throw new Error("<Capturer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerWidth() {
    		throw new Error("<Capturer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerWidth(value) {
    		throw new Error("<Capturer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get containerHeight() {
    		throw new Error("<Capturer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set containerHeight(value) {
    		throw new Error("<Capturer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Builder.svelte generated by Svelte v3.47.0 */
    const file$2 = "src\\Builder.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let fieldset;
    	let legend;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			legend.textContent = "Build";
    			t1 = space();
    			input = element("input");
    			add_location(legend, file$2, 24, 3, 454);
    			attr_dev(input, "type", "button");
    			input.value = "📦 Build banner";
    			attr_dev(input, "title", "Build banner");
    			add_location(input, file$2, 25, 3, 481);
    			add_location(fieldset, file$2, 23, 2, 439);
    			attr_dev(div, "class", "section svelte-10z5nmq");
    			add_location(div, file$2, 22, 1, 414);
    			attr_dev(main, "class", "svelte-10z5nmq");
    			add_location(main, file$2, 21, 0, 405);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, fieldset);
    			append_dev(fieldset, legend);
    			append_dev(fieldset, t1);
    			append_dev(fieldset, input);

    			if (!mounted) {
    				dispose = listen_dev(input, "click", build, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function apiRequest$1(data) {
    	const res = await fetch("/api", {
    		method: "POST",
    		body: JSON.stringify(data)
    	});

    	return await res.json();
    }

    async function build() {
    	await apiRequest$1({ method: "build" }); // TODO: build options
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Builder', slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Builder> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		apiRequest: apiRequest$1,
    		build
    	});

    	return [];
    }

    class Builder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Builder",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Events.svelte generated by Svelte v3.47.0 */
    const file$1 = "src\\Events.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let div0;
    	let fieldset0;
    	let legend0;
    	let t1;
    	let div1;
    	let fieldset1;
    	let legend1;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Messages";
    			t1 = space();
    			div1 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Callbacks";
    			add_location(legend0, file$1, 9, 3, 168);
    			add_location(fieldset0, file$1, 8, 2, 153);
    			attr_dev(div0, "class", "section svelte-10z5nmq");
    			add_location(div0, file$1, 7, 1, 128);
    			add_location(legend1, file$1, 15, 3, 278);
    			add_location(fieldset1, file$1, 14, 2, 263);
    			attr_dev(div1, "class", "section svelte-10z5nmq");
    			add_location(div1, file$1, 13, 1, 238);
    			attr_dev(main, "class", "svelte-10z5nmq");
    			add_location(main, file$1, 6, 0, 119);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, fieldset0);
    			append_dev(fieldset0, legend0);
    			append_dev(main, t1);
    			append_dev(main, div1);
    			append_dev(div1, fieldset1);
    			append_dev(fieldset1, legend1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Events', slots, []);
    	const dispatch = createEventDispatcher();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Events> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch });
    	return [];
    }

    class Events extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Events",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    // (143:38) 
    function create_if_block_4(ctx) {
    	let events;
    	let current;
    	events = new Events({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(events.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(events, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(events.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(events.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(events, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(143:38) ",
    		ctx
    	});

    	return block;
    }

    // (141:39) 
    function create_if_block_3(ctx) {
    	let builder;
    	let current;
    	builder = new Builder({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(builder.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(builder, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(builder.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(builder.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(builder, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(141:39) ",
    		ctx
    	});

    	return block;
    }

    // (135:40) 
    function create_if_block_2(ctx) {
    	let capturer;
    	let current;

    	capturer = new Capturer({
    			props: {
    				bannerWidth: /*banner*/ ctx[1].offsetWidth,
    				bannerHeight: /*banner*/ ctx[1].offsetHeight,
    				containerWidth: /*bannerWidth*/ ctx[3],
    				containerHeight: /*bannerHeight*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(capturer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(capturer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const capturer_changes = {};
    			if (dirty[0] & /*banner*/ 2) capturer_changes.bannerWidth = /*banner*/ ctx[1].offsetWidth;
    			if (dirty[0] & /*banner*/ 2) capturer_changes.bannerHeight = /*banner*/ ctx[1].offsetHeight;
    			if (dirty[0] & /*bannerWidth*/ 8) capturer_changes.containerWidth = /*bannerWidth*/ ctx[3];
    			if (dirty[0] & /*bannerHeight*/ 16) capturer_changes.containerHeight = /*bannerHeight*/ ctx[4];
    			capturer.$set(capturer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(capturer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(capturer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(capturer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(135:40) ",
    		ctx
    	});

    	return block;
    }

    // (133:4) {#if currentTab === "tools"}
    function create_if_block_1(ctx) {
    	let tools;
    	let current;
    	tools = new Tools({ $$inline: true });
    	tools.$on("open", /*toolOpen*/ ctx[18]);

    	const block = {
    		c: function create() {
    			create_component(tools.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tools, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tools.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tools.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tools, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(133:4) {#if currentTab === \\\"tools\\\"}",
    		ctx
    	});

    	return block;
    }

    // (182:1) {#if showToolWindow}
    function create_if_block(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let iframe;
    	let iframe_src_value;
    	let t1;
    	let div2;
    	let img;
    	let img_src_value;
    	let div2_transition;
    	let div3_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			iframe = element("iframe");
    			t1 = space();
    			div2 = element("div");
    			img = element("img");
    			attr_dev(div0, "id", "overlay-bg");
    			attr_dev(div0, "class", "svelte-125wn80");
    			add_location(div0, file, 183, 3, 5277);
    			attr_dev(iframe, "title", "Tool Frame");
    			attr_dev(iframe, "id", "tool_frame");
    			if (!src_url_equal(iframe.src, iframe_src_value = /*toolURL*/ ctx[10])) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "class", "svelte-125wn80");
    			add_location(iframe, file, 185, 4, 5346);
    			attr_dev(div1, "id", "tool_frame_container");
    			attr_dev(div1, "class", "svelte-125wn80");
    			add_location(div1, file, 184, 3, 5309);
    			attr_dev(img, "id", "close-bg");
    			if (!src_url_equal(img.src, img_src_value = "images/close.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "close");
    			attr_dev(img, "class", "svelte-125wn80");
    			add_location(img, file, 188, 4, 5552);
    			attr_dev(div2, "id", "close");
    			attr_dev(div2, "class", "svelte-125wn80");
    			add_location(div2, file, 187, 3, 5468);
    			attr_dev(div3, "id", "overlay");
    			attr_dev(div3, "class", "svelte-125wn80");
    			add_location(div3, file, 182, 2, 5216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, iframe);
    			/*iframe_binding_1*/ ctx[26](iframe);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, img);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div2, "click", /*closeOverlay*/ ctx[19], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*toolURL*/ 1024 && !src_url_equal(iframe.src, iframe_src_value = /*toolURL*/ ctx[10])) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 100 }, true);
    				div2_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, { duration: 100 }, true);
    				div3_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 100 }, false);
    			div2_transition.run(0);
    			if (!div3_transition) div3_transition = create_bidirectional_transition(div3, fade, { duration: 100 }, false);
    			div3_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			/*iframe_binding_1*/ ctx[26](null);
    			if (detaching && div2_transition) div2_transition.end();
    			if (detaching && div3_transition) div3_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(182:1) {#if showToolWindow}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div11;
    	let div1;
    	let tabs;
    	let t0;
    	let div0;
    	let current_block_type_index;
    	let if_block0;
    	let t1;
    	let div10;
    	let div3;
    	let div2;
    	let iframe;
    	let iframe_src_value;
    	let t2;
    	let div9;
    	let div8;
    	let div4;
    	let p0;
    	let t4;
    	let input0;
    	let t5;
    	let input1;
    	let t6;
    	let div5;
    	let p1;
    	let t8;
    	let input2;
    	let t9;
    	let div6;
    	let p2;
    	let t11;
    	let input3;
    	let t12;
    	let div7;
    	let p3;
    	let t14;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t18;
    	let input4;
    	let t19;
    	let current;
    	let mounted;
    	let dispose;
    	tabs = new Tabs({ $$inline: true });
    	tabs.$on("change", /*tabChange*/ ctx[17]);
    	const if_block_creators = [create_if_block_1, create_if_block_2, create_if_block_3, create_if_block_4];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentTab*/ ctx[11] === "tools") return 0;
    		if (/*currentTab*/ ctx[11] === "capturer") return 1;
    		if (/*currentTab*/ ctx[11] === "builder") return 2;
    		if (/*currentTab*/ ctx[11] === "events") return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	let if_block1 = /*showToolWindow*/ ctx[8] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div11 = element("div");
    			div1 = element("div");
    			create_component(tabs.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div10 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			iframe = element("iframe");
    			t2 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div4 = element("div");
    			p0 = element("p");
    			p0.textContent = "Banner URL";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			div5 = element("div");
    			p1 = element("p");
    			p1.textContent = "Width";
    			t8 = space();
    			input2 = element("input");
    			t9 = space();
    			div6 = element("div");
    			p2 = element("p");
    			p2.textContent = "Height";
    			t11 = space();
    			input3 = element("input");
    			t12 = space();
    			div7 = element("div");
    			p3 = element("p");
    			p3.textContent = "Device";
    			t14 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "iPhone SE";
    			option1 = element("option");
    			option1.textContent = "iPhone XR";
    			option2 = element("option");
    			option2.textContent = "iPhone 12 Pro";
    			t18 = space();
    			input4 = element("input");
    			t19 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "id", "control_page");
    			attr_dev(div0, "class", "svelte-125wn80");
    			add_location(div0, file, 131, 3, 3437);
    			attr_dev(div1, "id", "control");
    			attr_dev(div1, "class", "svelte-125wn80");
    			add_location(div1, file, 129, 2, 3380);
    			attr_dev(iframe, "title", "banner");
    			attr_dev(iframe, "id", "banner");
    			if (!src_url_equal(iframe.src, iframe_src_value = "/index.html")) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "scrolling", "no");
    			attr_dev(iframe, "class", "svelte-125wn80");
    			add_location(iframe, file, 150, 5, 4008);
    			attr_dev(div2, "id", "banner_container");
    			attr_dev(div2, "class", "svelte-125wn80");
    			add_location(div2, file, 149, 4, 3946);
    			attr_dev(div3, "id", "resize_area");
    			attr_dev(div3, "class", "svelte-125wn80");
    			add_location(div3, file, 148, 3, 3918);
    			add_location(p0, file, 156, 6, 4226);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			set_style(input0, "width", "200px");
    			add_location(input0, file, 157, 6, 4251);
    			attr_dev(input1, "type", "button");
    			input1.value = "↻";
    			attr_dev(input1, "class", "svelte-125wn80");
    			add_location(input1, file, 158, 6, 4365);
    			attr_dev(div4, "class", "widget");
    			add_location(div4, file, 155, 5, 4198);
    			add_location(p1, file, 161, 6, 4467);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "size", "45");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "class", "svelte-125wn80");
    			add_location(input2, file, 162, 6, 4487);
    			attr_dev(div5, "class", "widget");
    			add_location(div5, file, 160, 5, 4439);
    			add_location(p2, file, 165, 6, 4629);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "size", "45");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "class", "svelte-125wn80");
    			add_location(input3, file, 166, 6, 4650);
    			attr_dev(div6, "class", "widget");
    			add_location(div6, file, 164, 5, 4601);
    			add_location(p3, file, 169, 6, 4793);
    			option0.__value = "iphone_se";
    			option0.value = option0.__value;
    			add_location(option0, file, 171, 7, 4888);
    			option1.__value = "iphone_xr";
    			option1.value = option1.__value;
    			add_location(option1, file, 172, 7, 4941);
    			option2.__value = "iphone_12_pro";
    			option2.value = option2.__value;
    			add_location(option2, file, 173, 7, 4994);
    			attr_dev(select, "class", "svelte-125wn80");
    			if (/*bannerDevice*/ ctx[7] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[25].call(select));
    			add_location(select, file, 170, 6, 4814);
    			attr_dev(input4, "type", "button");
    			input4.value = "Reset";
    			attr_dev(input4, "class", "svelte-125wn80");
    			add_location(input4, file, 175, 6, 5071);
    			attr_dev(div7, "class", "widget");
    			add_location(div7, file, 168, 5, 4765);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file, 154, 4, 4174);
    			attr_dev(div9, "id", "size_info");
    			attr_dev(div9, "class", "svelte-125wn80");
    			add_location(div9, file, 153, 3, 4148);
    			attr_dev(div10, "id", "preview");
    			attr_dev(div10, "class", "svelte-125wn80");
    			add_location(div10, file, 147, 2, 3895);
    			attr_dev(div11, "id", "ui");
    			attr_dev(div11, "class", "svelte-125wn80");
    			add_location(div11, file, 128, 1, 3363);
    			attr_dev(main, "class", "svelte-125wn80");
    			add_location(main, file, 127, 0, 3354);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div11);
    			append_dev(div11, div1);
    			mount_component(tabs, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div0, null);
    			}

    			append_dev(div11, t1);
    			append_dev(div11, div10);
    			append_dev(div10, div3);
    			append_dev(div3, div2);
    			append_dev(div2, iframe);
    			/*iframe_binding*/ ctx[20](iframe);
    			/*div2_binding*/ ctx[21](div2);
    			append_dev(div10, t2);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div4);
    			append_dev(div4, p0);
    			append_dev(div4, t4);
    			append_dev(div4, input0);
    			set_input_value(input0, /*bannerURL*/ ctx[2]);
    			append_dev(div4, t5);
    			append_dev(div4, input1);
    			append_dev(div8, t6);
    			append_dev(div8, div5);
    			append_dev(div5, p1);
    			append_dev(div5, t8);
    			append_dev(div5, input2);
    			set_input_value(input2, /*bannerWidthProp*/ ctx[5]);
    			append_dev(div8, t9);
    			append_dev(div8, div6);
    			append_dev(div6, p2);
    			append_dev(div6, t11);
    			append_dev(div6, input3);
    			set_input_value(input3, /*bannerHeightProp*/ ctx[6]);
    			append_dev(div8, t12);
    			append_dev(div8, div7);
    			append_dev(div7, p3);
    			append_dev(div7, t14);
    			append_dev(div7, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*bannerDevice*/ ctx[7]);
    			append_dev(div7, t18);
    			append_dev(div7, input4);
    			append_dev(main, t19);
    			if (if_block1) if_block1.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[22]),
    					listen_dev(input0, "keypress", /*bannerSrcKeyPress*/ ctx[13], false, false, false),
    					listen_dev(input1, "click", /*loadBanner*/ ctx[14], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[23]),
    					listen_dev(input2, "input", /*bannerSizeChange*/ ctx[12], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[24]),
    					listen_dev(input3, "input", /*bannerSizeChange*/ ctx[12], false, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[25]),
    					listen_dev(select, "change", /*bannerDeviceChange*/ ctx[15], false, false, false),
    					listen_dev(input4, "click", /*bannerResetSize*/ ctx[16], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block0) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block0 = if_blocks[current_block_type_index];

    					if (!if_block0) {
    						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block0.c();
    					} else {
    						if_block0.p(ctx, dirty);
    					}

    					transition_in(if_block0, 1);
    					if_block0.m(div0, null);
    				} else {
    					if_block0 = null;
    				}
    			}

    			if (dirty[0] & /*bannerURL*/ 4 && input0.value !== /*bannerURL*/ ctx[2]) {
    				set_input_value(input0, /*bannerURL*/ ctx[2]);
    			}

    			if (dirty[0] & /*bannerWidthProp*/ 32 && to_number(input2.value) !== /*bannerWidthProp*/ ctx[5]) {
    				set_input_value(input2, /*bannerWidthProp*/ ctx[5]);
    			}

    			if (dirty[0] & /*bannerHeightProp*/ 64 && to_number(input3.value) !== /*bannerHeightProp*/ ctx[6]) {
    				set_input_value(input3, /*bannerHeightProp*/ ctx[6]);
    			}

    			if (dirty[0] & /*bannerDevice*/ 128) {
    				select_option(select, /*bannerDevice*/ ctx[7]);
    			}

    			if (/*showToolWindow*/ ctx[8]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*showToolWindow*/ 256) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(main, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(tabs);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			/*iframe_binding*/ ctx[20](null);
    			/*div2_binding*/ ctx[21](null);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function apiRequest(data) {
    	const res = await fetch("/api", {
    		method: "POST",
    		body: JSON.stringify(data)
    	});

    	return await res.json();
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let sse;

    	const screens = {
    		iphone_se: { width: 375, height: 667 },
    		iphone_xr: { width: 414, height: 896 },
    		iphone_12_pro: { width: 390, height: 844 }
    	};

    	let bannerContainer;
    	let banner;
    	let bannerURL = "/index.html";
    	let bannerInternalContainer;
    	let bannerDefaultWidth = 240;
    	let bannerDefaultHeight = 400;
    	let bannerWidth = bannerDefaultWidth;
    	let bannerHeight = bannerDefaultHeight;
    	let bannerWidthProp = bannerWidth;
    	let bannerHeightProp = bannerHeight;
    	let bannerDevice = "default";
    	let showToolWindow = false;
    	let toolFrame;
    	let toolURL;
    	let observer;

    	// tools, capturer, builder, events
    	let currentTab = "tools";

    	onMount(async () => {
    		sse = new EventSource("/sse?events=watcher");

    		sse.onmessage = async function (event) {
    			JSON.parse(event.data);
    		};

    		sse.onerror = function (error) {
    			console.error("EventSource failed: ", error);
    		};

    		$$invalidate(1, banner.onload = bannerOnLoad, banner);

    		observer = new ResizeObserver(mutations => {
    				$$invalidate(3, bannerWidth = mutations[0].contentRect.width);
    				$$invalidate(4, bannerHeight = mutations[0].contentRect.height);
    				$$invalidate(5, bannerWidthProp = bannerWidth);
    				$$invalidate(6, bannerHeightProp = bannerHeight);
    			});

    		observer.observe(bannerContainer);
    	});

    	function bannerOnLoad(event) {
    		console.log("Banner loaded");
    		const bannerWindow = banner.contentWindow;
    		const bannerDocument = bannerWindow.document;
    		bannerInternalContainer = bannerDocument.getElementById("container");

    		if (bannerInternalContainer) {
    			bannerDefaultWidth = bannerInternalContainer.offsetWidth;
    			bannerDefaultHeight = bannerInternalContainer.offsetHeight;
    		}
    	}

    	function bannerSizeChange(event) {
    		observer.disconnect();
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    		observer.observe(bannerContainer);
    	}

    	function bannerSrcKeyPress(event) {
    		if (event.charCode === 13) {
    			loadBanner();
    		}
    	}

    	function loadBanner() {
    		$$invalidate(1, banner.src = "", banner);
    		$$invalidate(1, banner.src = bannerURL, banner);
    		timerStart();
    	}

    	function bannerDeviceChange() {
    		let screen = screens[bannerDevice];
    		$$invalidate(5, bannerWidthProp = screen.width);
    		$$invalidate(6, bannerHeightProp = screen.height);
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	function bannerResetSize() {
    		$$invalidate(5, bannerWidthProp = bannerDefaultWidth);
    		$$invalidate(6, bannerHeightProp = bannerDefaultHeight);
    		$$invalidate(0, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(0, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	function tabChange(event) {
    		$$invalidate(11, currentTab = event.detail.tab);
    	}

    	function toolOpen(event) {
    		$$invalidate(10, toolURL = event.detail.url);
    		console.log(toolURL);
    		$$invalidate(8, showToolWindow = true);
    	}

    	function closeOverlay() {
    		$$invalidate(8, showToolWindow = false);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function iframe_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			banner = $$value;
    			$$invalidate(1, banner);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			bannerContainer = $$value;
    			$$invalidate(0, bannerContainer);
    		});
    	}

    	function input0_input_handler() {
    		bannerURL = this.value;
    		$$invalidate(2, bannerURL);
    	}

    	function input2_input_handler() {
    		bannerWidthProp = to_number(this.value);
    		$$invalidate(5, bannerWidthProp);
    	}

    	function input3_input_handler() {
    		bannerHeightProp = to_number(this.value);
    		$$invalidate(6, bannerHeightProp);
    	}

    	function select_change_handler() {
    		bannerDevice = select_value(this);
    		$$invalidate(7, bannerDevice);
    	}

    	function iframe_binding_1($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			toolFrame = $$value;
    			$$invalidate(9, toolFrame);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		Tabs,
    		Tools,
    		timerStart,
    		Capturer,
    		Builder,
    		Events,
    		sse,
    		screens,
    		bannerContainer,
    		banner,
    		bannerURL,
    		bannerInternalContainer,
    		bannerDefaultWidth,
    		bannerDefaultHeight,
    		bannerWidth,
    		bannerHeight,
    		bannerWidthProp,
    		bannerHeightProp,
    		bannerDevice,
    		showToolWindow,
    		toolFrame,
    		toolURL,
    		observer,
    		currentTab,
    		apiRequest,
    		bannerOnLoad,
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize,
    		tabChange,
    		toolOpen,
    		closeOverlay
    	});

    	$$self.$inject_state = $$props => {
    		if ('sse' in $$props) sse = $$props.sse;
    		if ('bannerContainer' in $$props) $$invalidate(0, bannerContainer = $$props.bannerContainer);
    		if ('banner' in $$props) $$invalidate(1, banner = $$props.banner);
    		if ('bannerURL' in $$props) $$invalidate(2, bannerURL = $$props.bannerURL);
    		if ('bannerInternalContainer' in $$props) bannerInternalContainer = $$props.bannerInternalContainer;
    		if ('bannerDefaultWidth' in $$props) bannerDefaultWidth = $$props.bannerDefaultWidth;
    		if ('bannerDefaultHeight' in $$props) bannerDefaultHeight = $$props.bannerDefaultHeight;
    		if ('bannerWidth' in $$props) $$invalidate(3, bannerWidth = $$props.bannerWidth);
    		if ('bannerHeight' in $$props) $$invalidate(4, bannerHeight = $$props.bannerHeight);
    		if ('bannerWidthProp' in $$props) $$invalidate(5, bannerWidthProp = $$props.bannerWidthProp);
    		if ('bannerHeightProp' in $$props) $$invalidate(6, bannerHeightProp = $$props.bannerHeightProp);
    		if ('bannerDevice' in $$props) $$invalidate(7, bannerDevice = $$props.bannerDevice);
    		if ('showToolWindow' in $$props) $$invalidate(8, showToolWindow = $$props.showToolWindow);
    		if ('toolFrame' in $$props) $$invalidate(9, toolFrame = $$props.toolFrame);
    		if ('toolURL' in $$props) $$invalidate(10, toolURL = $$props.toolURL);
    		if ('observer' in $$props) observer = $$props.observer;
    		if ('currentTab' in $$props) $$invalidate(11, currentTab = $$props.currentTab);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		bannerContainer,
    		banner,
    		bannerURL,
    		bannerWidth,
    		bannerHeight,
    		bannerWidthProp,
    		bannerHeightProp,
    		bannerDevice,
    		showToolWindow,
    		toolFrame,
    		toolURL,
    		currentTab,
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize,
    		tabChange,
    		toolOpen,
    		closeOverlay,
    		iframe_binding,
    		div2_binding,
    		input0_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		select_change_handler,
    		iframe_binding_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
