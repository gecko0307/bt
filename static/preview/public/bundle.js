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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
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
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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
    	let div;
    	let fieldset;
    	let legend;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			legend.textContent = "Tools";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			add_location(legend, file$4, 25, 3, 442);
    			attr_dev(input0, "type", "button");
    			input0.value = "🖼️ Images";
    			attr_dev(input0, "title", "Image Optimizer");
    			add_location(input0, file$4, 26, 3, 469);
    			attr_dev(input1, "type", "button");
    			input1.value = "🗛 Fonts";
    			attr_dev(input1, "title", "Web Font Generator");
    			add_location(input1, file$4, 27, 3, 575);
    			add_location(fieldset, file$4, 24, 2, 427);
    			attr_dev(div, "class", "section svelte-10z5nmq");
    			add_location(div, file$4, 23, 1, 402);
    			attr_dev(main, "class", "svelte-10z5nmq");
    			add_location(main, file$4, 22, 0, 393);
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
    			append_dev(fieldset, input0);
    			append_dev(fieldset, t2);
    			append_dev(fieldset, input1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "click", /*click_handler*/ ctx[1], false, false, false),
    					listen_dev(input1, "click", /*click_handler_1*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function apiRequest$3(data) {
    	const res = await fetch("/api", {
    		method: "POST",
    		body: JSON.stringify(data)
    	});

    	return await res.json();
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tools', slots, []);
    	const dispatch = createEventDispatcher();

    	onMount(async () => {
    		
    	}); //

    	function openURL(url) {
    		dispatch("open", { url });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tools> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => openURL("/images");
    	const click_handler_1 = () => openURL("/fonts");

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		dispatch,
    		apiRequest: apiRequest$3,
    		openURL
    	});

    	return [openURL, click_handler, click_handler_1];
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

    const { console: console_1$2 } = globals;
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
    	let t8;
    	let p3;
    	let input0;
    	let t9;
    	let p4;
    	let t11;
    	let p5;
    	let input1;
    	let t12;
    	let label;
    	let input2;
    	let t13;
    	let t14;
    	let p6;
    	let input3;
    	let t15;
    	let div1;
    	let fieldset1;
    	let legend1;
    	let t17;
    	let p7;
    	let t19;
    	let p8;
    	let select1;
    	let option2;
    	let option3;
    	let t22;
    	let p9;
    	let input4;
    	let t23;
    	let div2;
    	let fieldset2;
    	let legend2;
    	let t25;
    	let p10;
    	let t27;
    	let p11;
    	let select2;
    	let option4;
    	let option5;
    	let t30;
    	let p12;
    	let t32;
    	let p13;
    	let input5;
    	let t33;
    	let p14;
    	let t35;
    	let p15;
    	let input6;
    	let t36;
    	let p16;
    	let t38;
    	let p17;
    	let input7;
    	let t39;
    	let p18;
    	let t41;
    	let p19;
    	let input8;
    	let t42;
    	let input9;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			fieldset0 = element("fieldset");
    			legend0 = element("legend");
    			legend0.textContent = "Screenshot";
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
    			p2.textContent = "Filename";
    			t8 = space();
    			p3 = element("p");
    			input0 = element("input");
    			t9 = space();
    			p4 = element("p");
    			p4.textContent = "Zoom";
    			t11 = space();
    			p5 = element("p");
    			input1 = element("input");
    			t12 = space();
    			label = element("label");
    			input2 = element("input");
    			t13 = text("\r\n\t\t\t\tTransparent background");
    			t14 = space();
    			p6 = element("p");
    			input3 = element("input");
    			t15 = space();
    			div1 = element("div");
    			fieldset1 = element("fieldset");
    			legend1 = element("legend");
    			legend1.textContent = "Fallback (GIF + PSD)";
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Size";
    			t19 = space();
    			p8 = element("p");
    			select1 = element("select");
    			option2 = element("option");
    			option2.textContent = "From banner";
    			option3 = element("option");
    			option3.textContent = "From container";
    			t22 = space();
    			p9 = element("p");
    			input4 = element("input");
    			t23 = space();
    			div2 = element("div");
    			fieldset2 = element("fieldset");
    			legend2 = element("legend");
    			legend2.textContent = "Video";
    			t25 = space();
    			p10 = element("p");
    			p10.textContent = "Size";
    			t27 = space();
    			p11 = element("p");
    			select2 = element("select");
    			option4 = element("option");
    			option4.textContent = "From banner";
    			option5 = element("option");
    			option5.textContent = "From container";
    			t30 = space();
    			p12 = element("p");
    			p12.textContent = "FPS";
    			t32 = space();
    			p13 = element("p");
    			input5 = element("input");
    			t33 = space();
    			p14 = element("p");
    			p14.textContent = "Duration (0 = autodetect)";
    			t35 = space();
    			p15 = element("p");
    			input6 = element("input");
    			t36 = space();
    			p16 = element("p");
    			p16.textContent = "Filename";
    			t38 = space();
    			p17 = element("p");
    			input7 = element("input");
    			t39 = space();
    			p18 = element("p");
    			p18.textContent = "Compression rate";
    			t41 = space();
    			p19 = element("p");
    			input8 = element("input");
    			t42 = space();
    			input9 = element("input");
    			add_location(legend0, file$3, 143, 3, 2948);
    			add_location(p0, file$3, 144, 3, 2980);
    			option0.__value = "banner";
    			option0.value = option0.__value;
    			option0.selected = true;
    			add_location(option0, file$3, 147, 5, 3052);
    			option1.__value = "container";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 148, 5, 3111);
    			attr_dev(select0, "class", "svelte-1whc5st");
    			if (/*screenshotSizeMode*/ ctx[0] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[18].call(select0));
    			add_location(select0, file$3, 146, 4, 3005);
    			add_location(p1, file$3, 145, 3, 2996);
    			add_location(p2, file$3, 151, 3, 3189);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			set_style(input0, "width", "200px");
    			attr_dev(input0, "class", "svelte-1whc5st");
    			add_location(input0, file$3, 152, 6, 3212);
    			add_location(p3, file$3, 152, 3, 3209);
    			add_location(p4, file$3, 153, 3, 3302);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "size", "45");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "step", "1");
    			attr_dev(input1, "class", "svelte-1whc5st");
    			add_location(input1, file$3, 154, 6, 3321);
    			add_location(p5, file$3, 154, 3, 3318);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-1whc5st");
    			add_location(input2, file$3, 156, 4, 3405);
    			add_location(label, file$3, 155, 3, 3392);
    			attr_dev(input3, "type", "button");
    			input3.value = "📷 Capture Screenshot";
    			attr_dev(input3, "title", "Capture screenshot");
    			add_location(input3, file$3, 159, 6, 3506);
    			add_location(p6, file$3, 159, 3, 3503);
    			add_location(fieldset0, file$3, 142, 2, 2933);
    			attr_dev(div0, "class", "section svelte-1whc5st");
    			add_location(div0, file$3, 141, 1, 2908);
    			add_location(legend1, file$3, 164, 3, 3685);
    			add_location(p7, file$3, 165, 3, 3727);
    			option2.__value = "banner";
    			option2.value = option2.__value;
    			option2.selected = true;
    			add_location(option2, file$3, 168, 5, 3797);
    			option3.__value = "container";
    			option3.value = option3.__value;
    			add_location(option3, file$3, 169, 5, 3856);
    			attr_dev(select1, "class", "svelte-1whc5st");
    			if (/*fallbackSizeMode*/ ctx[1] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[22].call(select1));
    			add_location(select1, file$3, 167, 4, 3752);
    			add_location(p8, file$3, 166, 3, 3743);
    			attr_dev(input4, "type", "button");
    			input4.value = "📷 Capture Fallback";
    			attr_dev(input4, "title", "Capture fallback");
    			add_location(input4, file$3, 172, 6, 3937);
    			add_location(p9, file$3, 172, 3, 3934);
    			add_location(fieldset1, file$3, 163, 2, 3670);
    			attr_dev(div1, "class", "section svelte-1whc5st");
    			add_location(div1, file$3, 162, 1, 3645);
    			add_location(legend2, file$3, 177, 3, 4110);
    			add_location(p10, file$3, 178, 3, 4137);
    			option4.__value = "banner";
    			option4.value = option4.__value;
    			option4.selected = true;
    			add_location(option4, file$3, 181, 5, 4204);
    			option5.__value = "container";
    			option5.value = option5.__value;
    			add_location(option5, file$3, 182, 5, 4263);
    			attr_dev(select2, "class", "svelte-1whc5st");
    			if (/*videoSizeMode*/ ctx[2] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[23].call(select2));
    			add_location(select2, file$3, 180, 4, 4162);
    			add_location(p11, file$3, 179, 3, 4153);
    			add_location(p12, file$3, 185, 3, 4341);
    			attr_dev(input5, "type", "number");
    			attr_dev(input5, "size", "45");
    			attr_dev(input5, "min", "1");
    			attr_dev(input5, "class", "svelte-1whc5st");
    			add_location(input5, file$3, 186, 6, 4359);
    			add_location(p13, file$3, 186, 3, 4356);
    			add_location(p14, file$3, 187, 3, 4422);
    			attr_dev(input6, "type", "number");
    			attr_dev(input6, "size", "45");
    			set_style(input6, "width", "200px");
    			attr_dev(input6, "min", "0");
    			attr_dev(input6, "step", "1");
    			attr_dev(input6, "class", "svelte-1whc5st");
    			add_location(input6, file$3, 188, 6, 4462);
    			add_location(p15, file$3, 188, 3, 4459);
    			add_location(p16, file$3, 189, 3, 4562);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "size", "45");
    			set_style(input7, "width", "200px");
    			attr_dev(input7, "class", "svelte-1whc5st");
    			add_location(input7, file$3, 190, 6, 4585);
    			add_location(p17, file$3, 190, 3, 4582);
    			add_location(p18, file$3, 191, 3, 4670);
    			attr_dev(input8, "type", "number");
    			attr_dev(input8, "size", "45");
    			set_style(input8, "width", "200px");
    			attr_dev(input8, "min", "0");
    			attr_dev(input8, "step", "0.1");
    			attr_dev(input8, "class", "svelte-1whc5st");
    			add_location(input8, file$3, 192, 6, 4701);
    			add_location(p19, file$3, 192, 3, 4698);
    			attr_dev(input9, "type", "button");
    			input9.value = "🎥 Capture Video";
    			attr_dev(input9, "title", "Capture video");
    			add_location(input9, file$3, 193, 3, 4810);
    			add_location(fieldset2, file$3, 176, 2, 4095);
    			attr_dev(div2, "class", "section svelte-1whc5st");
    			add_location(div2, file$3, 175, 1, 4070);
    			attr_dev(main, "class", "svelte-1whc5st");
    			add_location(main, file$3, 140, 0, 2899);
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
    			select_option(select0, /*screenshotSizeMode*/ ctx[0]);
    			append_dev(fieldset0, t6);
    			append_dev(fieldset0, p2);
    			append_dev(fieldset0, t8);
    			append_dev(fieldset0, p3);
    			append_dev(p3, input0);
    			set_input_value(input0, /*screenshotFilename*/ ctx[3]);
    			append_dev(fieldset0, t9);
    			append_dev(fieldset0, p4);
    			append_dev(fieldset0, t11);
    			append_dev(fieldset0, p5);
    			append_dev(p5, input1);
    			set_input_value(input1, /*zoom*/ ctx[9]);
    			append_dev(fieldset0, t12);
    			append_dev(fieldset0, label);
    			append_dev(label, input2);
    			input2.checked = /*transparent*/ ctx[8];
    			append_dev(label, t13);
    			append_dev(fieldset0, t14);
    			append_dev(fieldset0, p6);
    			append_dev(p6, input3);
    			append_dev(main, t15);
    			append_dev(main, div1);
    			append_dev(div1, fieldset1);
    			append_dev(fieldset1, legend1);
    			append_dev(fieldset1, t17);
    			append_dev(fieldset1, p7);
    			append_dev(fieldset1, t19);
    			append_dev(fieldset1, p8);
    			append_dev(p8, select1);
    			append_dev(select1, option2);
    			append_dev(select1, option3);
    			select_option(select1, /*fallbackSizeMode*/ ctx[1]);
    			append_dev(fieldset1, t22);
    			append_dev(fieldset1, p9);
    			append_dev(p9, input4);
    			append_dev(main, t23);
    			append_dev(main, div2);
    			append_dev(div2, fieldset2);
    			append_dev(fieldset2, legend2);
    			append_dev(fieldset2, t25);
    			append_dev(fieldset2, p10);
    			append_dev(fieldset2, t27);
    			append_dev(fieldset2, p11);
    			append_dev(p11, select2);
    			append_dev(select2, option4);
    			append_dev(select2, option5);
    			select_option(select2, /*videoSizeMode*/ ctx[2]);
    			append_dev(fieldset2, t30);
    			append_dev(fieldset2, p12);
    			append_dev(fieldset2, t32);
    			append_dev(fieldset2, p13);
    			append_dev(p13, input5);
    			set_input_value(input5, /*fps*/ ctx[4]);
    			append_dev(fieldset2, t33);
    			append_dev(fieldset2, p14);
    			append_dev(fieldset2, t35);
    			append_dev(fieldset2, p15);
    			append_dev(p15, input6);
    			set_input_value(input6, /*videoDuration*/ ctx[7]);
    			append_dev(fieldset2, t36);
    			append_dev(fieldset2, p16);
    			append_dev(fieldset2, t38);
    			append_dev(fieldset2, p17);
    			append_dev(p17, input7);
    			set_input_value(input7, /*videoFilename*/ ctx[5]);
    			append_dev(fieldset2, t39);
    			append_dev(fieldset2, p18);
    			append_dev(fieldset2, t41);
    			append_dev(fieldset2, p19);
    			append_dev(p19, input8);
    			set_input_value(input8, /*videoCompressionRate*/ ctx[6]);
    			append_dev(fieldset2, t42);
    			append_dev(fieldset2, input9);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[18]),
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[19]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[20]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[21]),
    					listen_dev(input3, "click", /*captureScreenshot*/ ctx[10], false, false, false),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[22]),
    					listen_dev(input4, "click", /*captureFallback*/ ctx[11], false, false, false),
    					listen_dev(select2, "change", /*select2_change_handler*/ ctx[23]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[24]),
    					listen_dev(input6, "input", /*input6_input_handler*/ ctx[25]),
    					listen_dev(input7, "input", /*input7_input_handler*/ ctx[26]),
    					listen_dev(input8, "input", /*input8_input_handler*/ ctx[27]),
    					listen_dev(input9, "click", /*captureVideo*/ ctx[12], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*screenshotSizeMode*/ 1) {
    				select_option(select0, /*screenshotSizeMode*/ ctx[0]);
    			}

    			if (dirty & /*screenshotFilename*/ 8 && input0.value !== /*screenshotFilename*/ ctx[3]) {
    				set_input_value(input0, /*screenshotFilename*/ ctx[3]);
    			}

    			if (dirty & /*zoom*/ 512 && to_number(input1.value) !== /*zoom*/ ctx[9]) {
    				set_input_value(input1, /*zoom*/ ctx[9]);
    			}

    			if (dirty & /*transparent*/ 256) {
    				input2.checked = /*transparent*/ ctx[8];
    			}

    			if (dirty & /*fallbackSizeMode*/ 2) {
    				select_option(select1, /*fallbackSizeMode*/ ctx[1]);
    			}

    			if (dirty & /*videoSizeMode*/ 4) {
    				select_option(select2, /*videoSizeMode*/ ctx[2]);
    			}

    			if (dirty & /*fps*/ 16 && to_number(input5.value) !== /*fps*/ ctx[4]) {
    				set_input_value(input5, /*fps*/ ctx[4]);
    			}

    			if (dirty & /*videoDuration*/ 128 && to_number(input6.value) !== /*videoDuration*/ ctx[7]) {
    				set_input_value(input6, /*videoDuration*/ ctx[7]);
    			}

    			if (dirty & /*videoFilename*/ 32 && input7.value !== /*videoFilename*/ ctx[5]) {
    				set_input_value(input7, /*videoFilename*/ ctx[5]);
    			}

    			if (dirty & /*videoCompressionRate*/ 64 && to_number(input8.value) !== /*videoCompressionRate*/ ctx[6]) {
    				set_input_value(input8, /*videoCompressionRate*/ ctx[6]);
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
    	let { bannerTime } = $$props;
    	let screenshotSizeMode = "banner";
    	let fallbackSizeMode = "banner";
    	let videoSizeMode = "banner";
    	let screenshotFilename = "screenshot.png";
    	let fps = 60;
    	let videoFilename = "video.mp4";
    	let videoCompressionRate = 1;
    	let videoDuration = 0;
    	let transparent = false;
    	let zoom = 1;

    	async function captureScreenshot() {
    		dispatch("start", { message: "Capture screenshot..." });
    		let width, height;

    		if (screenshotSizeMode === "banner") {
    			width = bannerWidth;
    			height = bannerHeight;
    		} else if (screenshotSizeMode === "container") {
    			width = containerWidth;
    			height = containerHeight;
    		}

    		console.log(width, height);

    		const res = await apiRequest$2({
    			method: "capture",
    			screenshot: true,
    			transparent,
    			zoom,
    			screenshotTime: bannerTime,
    			screenshotFilename,
    			width,
    			height
    		});

    		dispatch("ready", {
    			...res,
    			capture: {
    				haveResult: true,
    				video: false,
    				screenshot: true,
    				filename: screenshotFilename,
    				width,
    				height
    			}
    		});
    	}

    	async function captureFallback() {
    		dispatch("start", { message: "Capture fallback..." });
    		let width, height;

    		if (fallbackSizeMode === "banner") {
    			width = bannerWidth;
    			height = bannerHeight;
    		} else if (fallbackSizeMode === "container") {
    			width = containerWidth;
    			height = containerHeight;
    		}

    		const res = await apiRequest$2({ method: "capture", width, height });

    		dispatch("ready", {
    			...res,
    			capture: {
    				haveResult: res.frames.length > 0,
    				video: false,
    				filename: "fallback.gif",
    				width,
    				height
    			}
    		});
    	}

    	async function captureVideo() {
    		dispatch("start", { message: "Capture video..." });
    		let width, height;

    		if (videoSizeMode === "banner") {
    			width = bannerWidth;
    			height = bannerHeight;
    		} else if (videoSizeMode === "container") {
    			width = containerWidth;
    			height = containerHeight;
    		}

    		const res = await apiRequest$2({
    			method: "capture",
    			video: true,
    			width,
    			height,
    			videoFps: fps,
    			videoFilename,
    			videoCompressionRate,
    			videoDuration
    		});

    		dispatch("ready", {
    			...res,
    			capture: {
    				haveResult: true,
    				video: true,
    				filename: videoFilename,
    				width,
    				height
    			}
    		});
    	}

    	const writable_props = [
    		'bannerWidth',
    		'bannerHeight',
    		'containerWidth',
    		'containerHeight',
    		'bannerTime'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<Capturer> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		screenshotSizeMode = select_value(this);
    		$$invalidate(0, screenshotSizeMode);
    	}

    	function input0_input_handler() {
    		screenshotFilename = this.value;
    		$$invalidate(3, screenshotFilename);
    	}

    	function input1_input_handler() {
    		zoom = to_number(this.value);
    		$$invalidate(9, zoom);
    	}

    	function input2_change_handler() {
    		transparent = this.checked;
    		$$invalidate(8, transparent);
    	}

    	function select1_change_handler() {
    		fallbackSizeMode = select_value(this);
    		$$invalidate(1, fallbackSizeMode);
    	}

    	function select2_change_handler() {
    		videoSizeMode = select_value(this);
    		$$invalidate(2, videoSizeMode);
    	}

    	function input5_input_handler() {
    		fps = to_number(this.value);
    		$$invalidate(4, fps);
    	}

    	function input6_input_handler() {
    		videoDuration = to_number(this.value);
    		$$invalidate(7, videoDuration);
    	}

    	function input7_input_handler() {
    		videoFilename = this.value;
    		$$invalidate(5, videoFilename);
    	}

    	function input8_input_handler() {
    		videoCompressionRate = to_number(this.value);
    		$$invalidate(6, videoCompressionRate);
    	}

    	$$self.$$set = $$props => {
    		if ('bannerWidth' in $$props) $$invalidate(13, bannerWidth = $$props.bannerWidth);
    		if ('bannerHeight' in $$props) $$invalidate(14, bannerHeight = $$props.bannerHeight);
    		if ('containerWidth' in $$props) $$invalidate(15, containerWidth = $$props.containerWidth);
    		if ('containerHeight' in $$props) $$invalidate(16, containerHeight = $$props.containerHeight);
    		if ('bannerTime' in $$props) $$invalidate(17, bannerTime = $$props.bannerTime);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		bannerWidth,
    		bannerHeight,
    		containerWidth,
    		containerHeight,
    		bannerTime,
    		screenshotSizeMode,
    		fallbackSizeMode,
    		videoSizeMode,
    		screenshotFilename,
    		fps,
    		videoFilename,
    		videoCompressionRate,
    		videoDuration,
    		transparent,
    		zoom,
    		apiRequest: apiRequest$2,
    		captureScreenshot,
    		captureFallback,
    		captureVideo
    	});

    	$$self.$inject_state = $$props => {
    		if ('bannerWidth' in $$props) $$invalidate(13, bannerWidth = $$props.bannerWidth);
    		if ('bannerHeight' in $$props) $$invalidate(14, bannerHeight = $$props.bannerHeight);
    		if ('containerWidth' in $$props) $$invalidate(15, containerWidth = $$props.containerWidth);
    		if ('containerHeight' in $$props) $$invalidate(16, containerHeight = $$props.containerHeight);
    		if ('bannerTime' in $$props) $$invalidate(17, bannerTime = $$props.bannerTime);
    		if ('screenshotSizeMode' in $$props) $$invalidate(0, screenshotSizeMode = $$props.screenshotSizeMode);
    		if ('fallbackSizeMode' in $$props) $$invalidate(1, fallbackSizeMode = $$props.fallbackSizeMode);
    		if ('videoSizeMode' in $$props) $$invalidate(2, videoSizeMode = $$props.videoSizeMode);
    		if ('screenshotFilename' in $$props) $$invalidate(3, screenshotFilename = $$props.screenshotFilename);
    		if ('fps' in $$props) $$invalidate(4, fps = $$props.fps);
    		if ('videoFilename' in $$props) $$invalidate(5, videoFilename = $$props.videoFilename);
    		if ('videoCompressionRate' in $$props) $$invalidate(6, videoCompressionRate = $$props.videoCompressionRate);
    		if ('videoDuration' in $$props) $$invalidate(7, videoDuration = $$props.videoDuration);
    		if ('transparent' in $$props) $$invalidate(8, transparent = $$props.transparent);
    		if ('zoom' in $$props) $$invalidate(9, zoom = $$props.zoom);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		screenshotSizeMode,
    		fallbackSizeMode,
    		videoSizeMode,
    		screenshotFilename,
    		fps,
    		videoFilename,
    		videoCompressionRate,
    		videoDuration,
    		transparent,
    		zoom,
    		captureScreenshot,
    		captureFallback,
    		captureVideo,
    		bannerWidth,
    		bannerHeight,
    		containerWidth,
    		containerHeight,
    		bannerTime,
    		select0_change_handler,
    		input0_input_handler,
    		input1_input_handler,
    		input2_change_handler,
    		select1_change_handler,
    		select2_change_handler,
    		input5_input_handler,
    		input6_input_handler,
    		input7_input_handler,
    		input8_input_handler
    	];
    }

    class Capturer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			bannerWidth: 13,
    			bannerHeight: 14,
    			containerWidth: 15,
    			containerHeight: 16,
    			bannerTime: 17
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Capturer",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*bannerWidth*/ ctx[13] === undefined && !('bannerWidth' in props)) {
    			console_1$2.warn("<Capturer> was created without expected prop 'bannerWidth'");
    		}

    		if (/*bannerHeight*/ ctx[14] === undefined && !('bannerHeight' in props)) {
    			console_1$2.warn("<Capturer> was created without expected prop 'bannerHeight'");
    		}

    		if (/*containerWidth*/ ctx[15] === undefined && !('containerWidth' in props)) {
    			console_1$2.warn("<Capturer> was created without expected prop 'containerWidth'");
    		}

    		if (/*containerHeight*/ ctx[16] === undefined && !('containerHeight' in props)) {
    			console_1$2.warn("<Capturer> was created without expected prop 'containerHeight'");
    		}

    		if (/*bannerTime*/ ctx[17] === undefined && !('bannerTime' in props)) {
    			console_1$2.warn("<Capturer> was created without expected prop 'bannerTime'");
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

    	get bannerTime() {
    		throw new Error("<Capturer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bannerTime(value) {
    		throw new Error("<Capturer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Builder.svelte generated by Svelte v3.47.0 */

    const { console: console_1$1 } = globals;
    const file$2 = "src\\Builder.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let fieldset;
    	let legend;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let input0;
    	let t4;
    	let p2;
    	let t6;
    	let p3;
    	let input1;
    	let t7;
    	let p4;
    	let t9;
    	let p5;
    	let input2;
    	let t10;
    	let p6;
    	let t12;
    	let p7;
    	let input3;
    	let t13;
    	let p8;
    	let t15;
    	let p9;
    	let input4;
    	let t16;
    	let p10;
    	let t18;
    	let p11;
    	let input5;
    	let t19;
    	let input6;
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
    			p0 = element("p");
    			p0.textContent = "Brand";
    			t3 = space();
    			p1 = element("p");
    			input0 = element("input");
    			t4 = space();
    			p2 = element("p");
    			p2.textContent = "Campaign";
    			t6 = space();
    			p3 = element("p");
    			input1 = element("input");
    			t7 = space();
    			p4 = element("p");
    			p4.textContent = "Creative";
    			t9 = space();
    			p5 = element("p");
    			input2 = element("input");
    			t10 = space();
    			p6 = element("p");
    			p6.textContent = "Size";
    			t12 = space();
    			p7 = element("p");
    			input3 = element("input");
    			t13 = space();
    			p8 = element("p");
    			p8.textContent = "Platform";
    			t15 = space();
    			p9 = element("p");
    			input4 = element("input");
    			t16 = space();
    			p10 = element("p");
    			p10.textContent = "Version";
    			t18 = space();
    			p11 = element("p");
    			input5 = element("input");
    			t19 = space();
    			input6 = element("input");
    			add_location(legend, file$2, 58, 3, 1152);
    			add_location(p0, file$2, 59, 3, 1179);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			set_style(input0, "width", "200px");
    			attr_dev(input0, "class", "svelte-jra80u");
    			add_location(input0, file$2, 60, 6, 1199);
    			add_location(p1, file$2, 60, 3, 1196);
    			add_location(p2, file$2, 61, 3, 1276);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "size", "45");
    			set_style(input1, "width", "200px");
    			attr_dev(input1, "class", "svelte-jra80u");
    			add_location(input1, file$2, 62, 6, 1299);
    			add_location(p3, file$2, 62, 3, 1296);
    			add_location(p4, file$2, 63, 3, 1379);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "size", "45");
    			set_style(input2, "width", "200px");
    			attr_dev(input2, "class", "svelte-jra80u");
    			add_location(input2, file$2, 64, 6, 1402);
    			add_location(p5, file$2, 64, 3, 1399);
    			add_location(p6, file$2, 65, 3, 1482);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "size", "45");
    			set_style(input3, "width", "200px");
    			attr_dev(input3, "class", "svelte-jra80u");
    			add_location(input3, file$2, 66, 6, 1501);
    			add_location(p7, file$2, 66, 3, 1498);
    			add_location(p8, file$2, 67, 3, 1577);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "size", "45");
    			set_style(input4, "width", "200px");
    			attr_dev(input4, "class", "svelte-jra80u");
    			add_location(input4, file$2, 68, 6, 1600);
    			add_location(p9, file$2, 68, 3, 1597);
    			add_location(p10, file$2, 69, 3, 1680);
    			attr_dev(input5, "type", "text");
    			attr_dev(input5, "size", "45");
    			set_style(input5, "width", "200px");
    			attr_dev(input5, "class", "svelte-jra80u");
    			add_location(input5, file$2, 70, 6, 1702);
    			add_location(p11, file$2, 70, 3, 1699);
    			attr_dev(input6, "type", "button");
    			input6.value = "📦 Build banner";
    			attr_dev(input6, "title", "Build banner");
    			add_location(input6, file$2, 71, 3, 1781);
    			add_location(fieldset, file$2, 57, 2, 1137);
    			attr_dev(div, "class", "section svelte-jra80u");
    			add_location(div, file$2, 56, 1, 1112);
    			attr_dev(main, "class", "svelte-jra80u");
    			add_location(main, file$2, 55, 0, 1103);
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
    			append_dev(fieldset, p0);
    			append_dev(fieldset, t3);
    			append_dev(fieldset, p1);
    			append_dev(p1, input0);
    			set_input_value(input0, /*brand*/ ctx[0]);
    			append_dev(fieldset, t4);
    			append_dev(fieldset, p2);
    			append_dev(fieldset, t6);
    			append_dev(fieldset, p3);
    			append_dev(p3, input1);
    			set_input_value(input1, /*campaign*/ ctx[1]);
    			append_dev(fieldset, t7);
    			append_dev(fieldset, p4);
    			append_dev(fieldset, t9);
    			append_dev(fieldset, p5);
    			append_dev(p5, input2);
    			set_input_value(input2, /*creative*/ ctx[2]);
    			append_dev(fieldset, t10);
    			append_dev(fieldset, p6);
    			append_dev(fieldset, t12);
    			append_dev(fieldset, p7);
    			append_dev(p7, input3);
    			set_input_value(input3, /*size*/ ctx[3]);
    			append_dev(fieldset, t13);
    			append_dev(fieldset, p8);
    			append_dev(fieldset, t15);
    			append_dev(fieldset, p9);
    			append_dev(p9, input4);
    			set_input_value(input4, /*platform*/ ctx[4]);
    			append_dev(fieldset, t16);
    			append_dev(fieldset, p10);
    			append_dev(fieldset, t18);
    			append_dev(fieldset, p11);
    			append_dev(p11, input5);
    			set_input_value(input5, /*version*/ ctx[5]);
    			append_dev(fieldset, t19);
    			append_dev(fieldset, input6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[10]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[11]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[12]),
    					listen_dev(input5, "input", /*input5_input_handler*/ ctx[13]),
    					listen_dev(input6, "click", /*build*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*brand*/ 1 && input0.value !== /*brand*/ ctx[0]) {
    				set_input_value(input0, /*brand*/ ctx[0]);
    			}

    			if (dirty & /*campaign*/ 2 && input1.value !== /*campaign*/ ctx[1]) {
    				set_input_value(input1, /*campaign*/ ctx[1]);
    			}

    			if (dirty & /*creative*/ 4 && input2.value !== /*creative*/ ctx[2]) {
    				set_input_value(input2, /*creative*/ ctx[2]);
    			}

    			if (dirty & /*size*/ 8 && input3.value !== /*size*/ ctx[3]) {
    				set_input_value(input3, /*size*/ ctx[3]);
    			}

    			if (dirty & /*platform*/ 16 && input4.value !== /*platform*/ ctx[4]) {
    				set_input_value(input4, /*platform*/ ctx[4]);
    			}

    			if (dirty & /*version*/ 32 && input5.value !== /*version*/ ctx[5]) {
    				set_input_value(input5, /*version*/ ctx[5]);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Builder', slots, []);
    	const dispatch = createEventDispatcher();
    	let { defaultSize = "0x0" } = $$props;
    	let brand = "";
    	let campaign = "";
    	let creative = "";
    	let size = defaultSize;
    	let platform = "publish";
    	let version = "v1";

    	onMount(async () => {
    		const config = await apiRequest$1({ method: "buildConfig" });
    		console.log(config);
    		$$invalidate(0, brand = config.brand || "");
    		$$invalidate(1, campaign = config.campaign || "");
    		$$invalidate(2, creative = config.creative || "");
    		$$invalidate(4, platform = config.platform || "publish");
    		$$invalidate(5, version = config.version || "v1");
    		$$invalidate(3, size = config.size || defaultSize);
    	});

    	async function build() {
    		dispatch("start", { message: "Build..." });
    		const res = await apiRequest$1({ method: "build" }); // TODO: build options
    		console.log(res);
    		dispatch("ready", { ...res, build: { haveResult: res.ok } });
    	}

    	const writable_props = ['defaultSize'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Builder> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		brand = this.value;
    		$$invalidate(0, brand);
    	}

    	function input1_input_handler() {
    		campaign = this.value;
    		$$invalidate(1, campaign);
    	}

    	function input2_input_handler() {
    		creative = this.value;
    		$$invalidate(2, creative);
    	}

    	function input3_input_handler() {
    		size = this.value;
    		$$invalidate(3, size);
    	}

    	function input4_input_handler() {
    		platform = this.value;
    		$$invalidate(4, platform);
    	}

    	function input5_input_handler() {
    		version = this.value;
    		$$invalidate(5, version);
    	}

    	$$self.$$set = $$props => {
    		if ('defaultSize' in $$props) $$invalidate(7, defaultSize = $$props.defaultSize);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		dispatch,
    		defaultSize,
    		brand,
    		campaign,
    		creative,
    		size,
    		platform,
    		version,
    		apiRequest: apiRequest$1,
    		build
    	});

    	$$self.$inject_state = $$props => {
    		if ('defaultSize' in $$props) $$invalidate(7, defaultSize = $$props.defaultSize);
    		if ('brand' in $$props) $$invalidate(0, brand = $$props.brand);
    		if ('campaign' in $$props) $$invalidate(1, campaign = $$props.campaign);
    		if ('creative' in $$props) $$invalidate(2, creative = $$props.creative);
    		if ('size' in $$props) $$invalidate(3, size = $$props.size);
    		if ('platform' in $$props) $$invalidate(4, platform = $$props.platform);
    		if ('version' in $$props) $$invalidate(5, version = $$props.version);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		brand,
    		campaign,
    		creative,
    		size,
    		platform,
    		version,
    		build,
    		defaultSize,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler
    	];
    }

    class Builder extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { defaultSize: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Builder",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get defaultSize() {
    		throw new Error("<Builder>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set defaultSize(value) {
    		throw new Error("<Builder>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[65] = list[i];
    	return child_ctx;
    }

    // (325:38) 
    function create_if_block_9(ctx) {
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
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(325:38) ",
    		ctx
    	});

    	return block;
    }

    // (320:39) 
    function create_if_block_8(ctx) {
    	let builder;
    	let current;

    	builder = new Builder({
    			props: { defaultSize: /*defaultSize*/ ctx[8] },
    			$$inline: true
    		});

    	builder.$on("start", /*buildStart*/ ctx[36]);
    	builder.$on("ready", /*buildReady*/ ctx[37]);

    	const block = {
    		c: function create() {
    			create_component(builder.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(builder, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const builder_changes = {};
    			if (dirty[0] & /*defaultSize*/ 256) builder_changes.defaultSize = /*defaultSize*/ ctx[8];
    			builder.$set(builder_changes);
    		},
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
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(320:39) ",
    		ctx
    	});

    	return block;
    }

    // (311:40) 
    function create_if_block_7(ctx) {
    	let capturer;
    	let current;

    	capturer = new Capturer({
    			props: {
    				bannerWidth: /*bannerDefaultWidth*/ ctx[5],
    				bannerHeight: /*bannerDefaultHeight*/ ctx[6],
    				containerWidth: /*bannerWidthProp*/ ctx[0],
    				containerHeight: /*bannerHeightProp*/ ctx[1],
    				bannerTime: /*bannerTime*/ ctx[14]
    			},
    			$$inline: true
    		});

    	capturer.$on("start", /*captureStart*/ ctx[34]);
    	capturer.$on("ready", /*captureReady*/ ctx[35]);

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
    			if (dirty[0] & /*bannerDefaultWidth*/ 32) capturer_changes.bannerWidth = /*bannerDefaultWidth*/ ctx[5];
    			if (dirty[0] & /*bannerDefaultHeight*/ 64) capturer_changes.bannerHeight = /*bannerDefaultHeight*/ ctx[6];
    			if (dirty[0] & /*bannerWidthProp*/ 1) capturer_changes.containerWidth = /*bannerWidthProp*/ ctx[0];
    			if (dirty[0] & /*bannerHeightProp*/ 2) capturer_changes.containerHeight = /*bannerHeightProp*/ ctx[1];
    			if (dirty[0] & /*bannerTime*/ 16384) capturer_changes.bannerTime = /*bannerTime*/ ctx[14];
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
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(311:40) ",
    		ctx
    	});

    	return block;
    }

    // (309:4) {#if currentTab === "tools"}
    function create_if_block_6(ctx) {
    	let tools;
    	let current;
    	tools = new Tools({ $$inline: true });
    	tools.$on("open", /*toolOpen*/ ctx[32]);

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
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(309:4) {#if currentTab === \\\"tools\\\"}",
    		ctx
    	});

    	return block;
    }

    // (367:7) {#if timelineIDs !== undefined}
    function create_if_block_5(ctx) {
    	let each_1_anchor;
    	let each_value = /*timelineIDs*/ ctx[9];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*timelineIDs*/ 512) {
    				each_value = /*timelineIDs*/ ctx[9];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(367:7) {#if timelineIDs !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (368:8) {#each timelineIDs as id}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*id*/ ctx[65] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*id*/ ctx[65];
    			option.value = option.__value;
    			add_location(option, file, 368, 9, 10226);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*timelineIDs*/ 512 && t_value !== (t_value = /*id*/ ctx[65] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*timelineIDs*/ 512 && option_value_value !== (option_value_value = /*id*/ ctx[65])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(368:8) {#each timelineIDs as id}",
    		ctx
    	});

    	return block;
    }

    // (383:1) {#if showOverlay}
    function create_if_block(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let div1;
    	let img;
    	let img_src_value;
    	let div1_transition;
    	let div2_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*inProgress*/ ctx[18] && create_if_block_4(ctx);
    	let if_block1 = /*showCapture*/ ctx[19] && create_if_block_2(ctx);
    	let if_block2 = /*showToolWindow*/ ctx[22] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			t2 = space();
    			if (if_block2) if_block2.c();
    			t3 = space();
    			div1 = element("div");
    			img = element("img");
    			attr_dev(div0, "id", "overlay-bg");
    			attr_dev(div0, "class", "svelte-1hd43id");
    			add_location(div0, file, 384, 3, 10837);
    			attr_dev(img, "id", "close-bg");
    			if (!src_url_equal(img.src, img_src_value = "images/close.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "close");
    			attr_dev(img, "class", "svelte-1hd43id");
    			add_location(img, file, 404, 4, 11620);
    			attr_dev(div1, "id", "close");
    			attr_dev(div1, "class", "svelte-1hd43id");
    			add_location(div1, file, 403, 3, 11536);
    			attr_dev(div2, "id", "overlay");
    			attr_dev(div2, "class", "svelte-1hd43id");
    			add_location(div2, file, 383, 2, 10776);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t1);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div2, t2);
    			if (if_block2) if_block2.m(div2, null);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*closeOverlay*/ ctx[33], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*inProgress*/ ctx[18]) {
    				if (if_block0) {
    					if (dirty[0] & /*inProgress*/ 262144) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div2, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*showCapture*/ ctx[19]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*showCapture*/ 524288) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div2, t2);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*showToolWindow*/ ctx[22]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(div2, t3);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, true);
    				div1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 100 }, true);
    				div2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, false);
    			div1_transition.run(0);
    			if (!div2_transition) div2_transition = create_bidirectional_transition(div2, fade, { duration: 100 }, false);
    			div2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching && div1_transition) div1_transition.end();
    			if (detaching && div2_transition) div2_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(383:1) {#if showOverlay}",
    		ctx
    	});

    	return block;
    }

    // (386:3) {#if inProgress}
    function create_if_block_4(ctx) {
    	let img;
    	let img_src_value;
    	let img_transition;
    	let current;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "id", "preloader");
    			if (!src_url_equal(img.src, img_src_value = "images/preloader.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "preloader");
    			attr_dev(img, "class", "svelte-1hd43id");
    			add_location(img, file, 386, 4, 10891);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: 100 }, true);
    				img_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!img_transition) img_transition = create_bidirectional_transition(img, fade, { duration: 100 }, false);
    			img_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			if (detaching && img_transition) img_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(386:3) {#if inProgress}",
    		ctx
    	});

    	return block;
    }

    // (389:3) {#if showCapture}
    function create_if_block_2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_3, create_else_block];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*capturedVideo*/ ctx[20]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(389:3) {#if showCapture}",
    		ctx
    	});

    	return block;
    }

    // (395:4) {:else}
    function create_else_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "id", "fallback");
    			if (!src_url_equal(img.src, img_src_value = /*captureFilename*/ ctx[21])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Fallback");
    			attr_dev(img, "class", "svelte-1hd43id");
    			add_location(img, file, 395, 5, 11255);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*captureFilename*/ 2097152 && !src_url_equal(img.src, img_src_value = /*captureFilename*/ ctx[21])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(395:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (390:4) {#if capturedVideo}
    function create_if_block_3(ctx) {
    	let video;
    	let track;
    	let source;
    	let source_src_value;
    	let video_transition;
    	let current;

    	const block = {
    		c: function create() {
    			video = element("video");
    			track = element("track");
    			source = element("source");
    			attr_dev(track, "kind", "captions");
    			add_location(track, file, 391, 6, 11125);
    			attr_dev(source, "id", "video_src");
    			attr_dev(source, "type", "video/mp4");
    			if (!src_url_equal(source.src, source_src_value = /*captureFilename*/ ctx[21])) attr_dev(source, "src", source_src_value);
    			add_location(source, file, 392, 6, 11156);
    			attr_dev(video, "id", "video");
    			video.controls = true;
    			attr_dev(video, "class", "svelte-1hd43id");
    			add_location(video, file, 390, 5, 11054);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, video, anchor);
    			append_dev(video, track);
    			append_dev(video, source);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*captureFilename*/ 2097152 && !src_url_equal(source.src, source_src_value = /*captureFilename*/ ctx[21])) {
    				attr_dev(source, "src", source_src_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!video_transition) video_transition = create_bidirectional_transition(video, fade, { duration: 100 }, true);
    				video_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!video_transition) video_transition = create_bidirectional_transition(video, fade, { duration: 100 }, false);
    			video_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(video);
    			if (detaching && video_transition) video_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(390:4) {#if capturedVideo}",
    		ctx
    	});

    	return block;
    }

    // (399:3) {#if showToolWindow}
    function create_if_block_1(ctx) {
    	let div;
    	let iframe;
    	let iframe_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			iframe = element("iframe");
    			attr_dev(iframe, "title", "Tool Frame");
    			attr_dev(iframe, "id", "tool_frame");
    			if (!src_url_equal(iframe.src, iframe_src_value = /*toolURL*/ ctx[24])) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "class", "svelte-1hd43id");
    			add_location(iframe, file, 400, 5, 11403);
    			attr_dev(div, "id", "tool_frame_container");
    			attr_dev(div, "class", "svelte-1hd43id");
    			add_location(div, file, 399, 4, 11365);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, iframe);
    			/*iframe_binding_1*/ ctx[49](iframe);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*toolURL*/ 16777216 && !src_url_equal(iframe.src, iframe_src_value = /*toolURL*/ ctx[24])) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*iframe_binding_1*/ ctx[49](null);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(399:3) {#if showToolWindow}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div15;
    	let div1;
    	let tabs;
    	let t0;
    	let div0;
    	let current_block_type_index;
    	let if_block0;
    	let t1;
    	let div14;
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
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t18;
    	let input4;
    	let t19;
    	let div13;
    	let div12;
    	let div10;
    	let p4;
    	let t21;
    	let select1;
    	let t22;
    	let input5;
    	let input5_value_value;
    	let input5_disabled_value;
    	let t23;
    	let div11;
    	let p5;
    	let b;
    	let span0;
    	let t24;
    	let t25;
    	let span1;
    	let t26;
    	let t27;
    	let input6;
    	let input6_disabled_value;
    	let t28;
    	let current;
    	let mounted;
    	let dispose;
    	tabs = new Tabs({ $$inline: true });
    	tabs.$on("change", /*tabChange*/ ctx[31]);
    	const if_block_creators = [create_if_block_6, create_if_block_7, create_if_block_8, create_if_block_9];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentTab*/ ctx[25] === "tools") return 0;
    		if (/*currentTab*/ ctx[25] === "capturer") return 1;
    		if (/*currentTab*/ ctx[25] === "builder") return 2;
    		if (/*currentTab*/ ctx[25] === "events") return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	let if_block1 = /*timelineIDs*/ ctx[9] !== undefined && create_if_block_5(ctx);
    	let if_block2 = /*showOverlay*/ ctx[17] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div15 = element("div");
    			div1 = element("div");
    			create_component(tabs.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div14 = element("div");
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
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "iPhone SE";
    			option1 = element("option");
    			option1.textContent = "iPhone XR";
    			option2 = element("option");
    			option2.textContent = "iPhone 12 Pro";
    			t18 = space();
    			input4 = element("input");
    			t19 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div10 = element("div");
    			p4 = element("p");
    			p4.textContent = "Timeline";
    			t21 = space();
    			select1 = element("select");
    			if (if_block1) if_block1.c();
    			t22 = space();
    			input5 = element("input");
    			t23 = space();
    			div11 = element("div");
    			p5 = element("p");
    			b = element("b");
    			span0 = element("span");
    			t24 = text(/*displayTime*/ ctx[15]);
    			t25 = text(" / ");
    			span1 = element("span");
    			t26 = text(/*displayDuration*/ ctx[16]);
    			t27 = space();
    			input6 = element("input");
    			t28 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(div0, "id", "control_page");
    			attr_dev(div0, "class", "svelte-1hd43id");
    			add_location(div0, file, 307, 3, 8042);
    			attr_dev(div1, "id", "control");
    			attr_dev(div1, "class", "svelte-1hd43id");
    			add_location(div1, file, 305, 2, 7985);
    			attr_dev(iframe, "title", "banner");
    			attr_dev(iframe, "id", "banner");
    			if (!src_url_equal(iframe.src, iframe_src_value = "/index.html")) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "frameborder", "0");
    			attr_dev(iframe, "scrolling", "no");
    			attr_dev(iframe, "class", "svelte-1hd43id");
    			add_location(iframe, file, 332, 5, 8805);
    			attr_dev(div2, "id", "banner_container");
    			attr_dev(div2, "class", "svelte-1hd43id");
    			add_location(div2, file, 331, 4, 8743);
    			attr_dev(div3, "id", "resize_area");
    			attr_dev(div3, "class", "svelte-1hd43id");
    			add_location(div3, file, 330, 3, 8715);
    			add_location(p0, file, 338, 6, 9023);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "size", "45");
    			set_style(input0, "width", "200px");
    			add_location(input0, file, 339, 6, 9048);
    			attr_dev(input1, "type", "button");
    			input1.value = "↻";
    			attr_dev(input1, "class", "svelte-1hd43id");
    			add_location(input1, file, 340, 6, 9162);
    			attr_dev(div4, "class", "widget");
    			add_location(div4, file, 337, 5, 8995);
    			add_location(p1, file, 343, 6, 9264);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "size", "45");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "class", "svelte-1hd43id");
    			add_location(input2, file, 344, 6, 9284);
    			attr_dev(div5, "class", "widget");
    			add_location(div5, file, 342, 5, 9236);
    			add_location(p2, file, 347, 6, 9426);
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "size", "45");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "class", "svelte-1hd43id");
    			add_location(input3, file, 348, 6, 9447);
    			attr_dev(div6, "class", "widget");
    			add_location(div6, file, 346, 5, 9398);
    			add_location(p3, file, 351, 6, 9590);
    			option0.__value = "iphone_se";
    			option0.value = option0.__value;
    			add_location(option0, file, 353, 7, 9685);
    			option1.__value = "iphone_xr";
    			option1.value = option1.__value;
    			add_location(option1, file, 354, 7, 9738);
    			option2.__value = "iphone_12_pro";
    			option2.value = option2.__value;
    			add_location(option2, file, 355, 7, 9791);
    			attr_dev(select0, "class", "svelte-1hd43id");
    			if (/*bannerDevice*/ ctx[7] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[46].call(select0));
    			add_location(select0, file, 352, 6, 9611);
    			attr_dev(input4, "type", "button");
    			input4.value = "Reset";
    			attr_dev(input4, "class", "svelte-1hd43id");
    			add_location(input4, file, 357, 6, 9868);
    			attr_dev(div7, "class", "widget");
    			add_location(div7, file, 350, 5, 9562);
    			attr_dev(div8, "class", "row");
    			add_location(div8, file, 336, 4, 8971);
    			attr_dev(div9, "id", "size_info");
    			attr_dev(div9, "class", "svelte-1hd43id");
    			add_location(div9, file, 335, 3, 8945);
    			add_location(p4, file, 364, 6, 10049);
    			attr_dev(select1, "class", "svelte-1hd43id");
    			if (/*currentTimelineID*/ ctx[10] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[47].call(select1));
    			add_location(select1, file, 365, 6, 10072);
    			attr_dev(input5, "type", "button");
    			input5.value = input5_value_value = /*paused*/ ctx[12] ? '▶️' : '⏸️';
    			input5.disabled = input5_disabled_value = !/*timelineEnabled*/ ctx[11];
    			attr_dev(input5, "class", "svelte-1hd43id");
    			add_location(input5, file, 372, 6, 10316);
    			attr_dev(div10, "class", "widget");
    			add_location(div10, file, 363, 5, 10021);
    			add_location(span0, file, 375, 25, 10491);
    			add_location(b, file, 375, 22, 10488);
    			add_location(span1, file, 375, 58, 10524);
    			attr_dev(p5, "class", "time svelte-1hd43id");
    			add_location(p5, file, 375, 6, 10472);
    			attr_dev(input6, "type", "range");
    			attr_dev(input6, "min", "0");
    			attr_dev(input6, "max", "1");
    			attr_dev(input6, "step", "any");
    			input6.disabled = input6_disabled_value = !/*timelineEnabled*/ ctx[11];
    			attr_dev(input6, "class", "svelte-1hd43id");
    			add_location(input6, file, 376, 6, 10566);
    			attr_dev(div11, "class", "widget fill svelte-1hd43id");
    			add_location(div11, file, 374, 5, 10439);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file, 362, 4, 9997);
    			attr_dev(div13, "id", "timeline");
    			attr_dev(div13, "class", "svelte-1hd43id");
    			add_location(div13, file, 361, 3, 9972);
    			attr_dev(div14, "id", "preview");
    			attr_dev(div14, "class", "svelte-1hd43id");
    			add_location(div14, file, 329, 2, 8692);
    			attr_dev(div15, "id", "ui");
    			attr_dev(div15, "class", "svelte-1hd43id");
    			add_location(div15, file, 304, 1, 7968);
    			attr_dev(main, "class", "svelte-1hd43id");
    			add_location(main, file, 303, 0, 7959);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div15);
    			append_dev(div15, div1);
    			mount_component(tabs, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div0, null);
    			}

    			append_dev(div15, t1);
    			append_dev(div15, div14);
    			append_dev(div14, div3);
    			append_dev(div3, div2);
    			append_dev(div2, iframe);
    			/*iframe_binding*/ ctx[41](iframe);
    			/*div2_binding*/ ctx[42](div2);
    			append_dev(div14, t2);
    			append_dev(div14, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div4);
    			append_dev(div4, p0);
    			append_dev(div4, t4);
    			append_dev(div4, input0);
    			set_input_value(input0, /*bannerURL*/ ctx[4]);
    			append_dev(div4, t5);
    			append_dev(div4, input1);
    			append_dev(div8, t6);
    			append_dev(div8, div5);
    			append_dev(div5, p1);
    			append_dev(div5, t8);
    			append_dev(div5, input2);
    			set_input_value(input2, /*bannerWidthProp*/ ctx[0]);
    			append_dev(div8, t9);
    			append_dev(div8, div6);
    			append_dev(div6, p2);
    			append_dev(div6, t11);
    			append_dev(div6, input3);
    			set_input_value(input3, /*bannerHeightProp*/ ctx[1]);
    			append_dev(div8, t12);
    			append_dev(div8, div7);
    			append_dev(div7, p3);
    			append_dev(div7, t14);
    			append_dev(div7, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*bannerDevice*/ ctx[7]);
    			append_dev(div7, t18);
    			append_dev(div7, input4);
    			append_dev(div14, t19);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div10, p4);
    			append_dev(div10, t21);
    			append_dev(div10, select1);
    			if (if_block1) if_block1.m(select1, null);
    			select_option(select1, /*currentTimelineID*/ ctx[10]);
    			append_dev(div10, t22);
    			append_dev(div10, input5);
    			append_dev(div12, t23);
    			append_dev(div12, div11);
    			append_dev(div11, p5);
    			append_dev(p5, b);
    			append_dev(b, span0);
    			append_dev(span0, t24);
    			append_dev(p5, t25);
    			append_dev(p5, span1);
    			append_dev(span1, t26);
    			append_dev(div11, t27);
    			append_dev(div11, input6);
    			set_input_value(input6, /*timelineProgress*/ ctx[13]);
    			append_dev(main, t28);
    			if (if_block2) if_block2.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[43]),
    					listen_dev(input0, "keypress", /*bannerSrcKeyPress*/ ctx[27], false, false, false),
    					listen_dev(input1, "click", /*loadBanner*/ ctx[28], false, false, false),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[44]),
    					listen_dev(input2, "input", /*bannerSizeChange*/ ctx[26], false, false, false),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[45]),
    					listen_dev(input3, "input", /*bannerSizeChange*/ ctx[26], false, false, false),
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[46]),
    					listen_dev(select0, "change", /*bannerDeviceChange*/ ctx[29], false, false, false),
    					listen_dev(input4, "click", /*bannerResetSize*/ ctx[30], false, false, false),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[47]),
    					listen_dev(select1, "change", /*timelineIDChange*/ ctx[40], false, false, false),
    					listen_dev(input5, "click", /*togglePause*/ ctx[38], false, false, false),
    					listen_dev(input6, "change", /*input6_change_input_handler*/ ctx[48]),
    					listen_dev(input6, "input", /*input6_change_input_handler*/ ctx[48]),
    					listen_dev(input6, "input", /*timelineChange*/ ctx[39], false, false, false)
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

    			if (dirty[0] & /*bannerURL*/ 16 && input0.value !== /*bannerURL*/ ctx[4]) {
    				set_input_value(input0, /*bannerURL*/ ctx[4]);
    			}

    			if (dirty[0] & /*bannerWidthProp*/ 1 && to_number(input2.value) !== /*bannerWidthProp*/ ctx[0]) {
    				set_input_value(input2, /*bannerWidthProp*/ ctx[0]);
    			}

    			if (dirty[0] & /*bannerHeightProp*/ 2 && to_number(input3.value) !== /*bannerHeightProp*/ ctx[1]) {
    				set_input_value(input3, /*bannerHeightProp*/ ctx[1]);
    			}

    			if (dirty[0] & /*bannerDevice*/ 128) {
    				select_option(select0, /*bannerDevice*/ ctx[7]);
    			}

    			if (/*timelineIDs*/ ctx[9] !== undefined) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_5(ctx);
    					if_block1.c();
    					if_block1.m(select1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty[0] & /*currentTimelineID, timelineIDs*/ 1536) {
    				select_option(select1, /*currentTimelineID*/ ctx[10]);
    			}

    			if (!current || dirty[0] & /*paused*/ 4096 && input5_value_value !== (input5_value_value = /*paused*/ ctx[12] ? '▶️' : '⏸️')) {
    				prop_dev(input5, "value", input5_value_value);
    			}

    			if (!current || dirty[0] & /*timelineEnabled*/ 2048 && input5_disabled_value !== (input5_disabled_value = !/*timelineEnabled*/ ctx[11])) {
    				prop_dev(input5, "disabled", input5_disabled_value);
    			}

    			if (!current || dirty[0] & /*displayTime*/ 32768) set_data_dev(t24, /*displayTime*/ ctx[15]);
    			if (!current || dirty[0] & /*displayDuration*/ 65536) set_data_dev(t26, /*displayDuration*/ ctx[16]);

    			if (!current || dirty[0] & /*timelineEnabled*/ 2048 && input6_disabled_value !== (input6_disabled_value = !/*timelineEnabled*/ ctx[11])) {
    				prop_dev(input6, "disabled", input6_disabled_value);
    			}

    			if (dirty[0] & /*timelineProgress*/ 8192) {
    				set_input_value(input6, /*timelineProgress*/ ctx[13]);
    			}

    			if (/*showOverlay*/ ctx[17]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty[0] & /*showOverlay*/ 131072) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(main, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(tabs);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			/*iframe_binding*/ ctx[41](null);
    			/*div2_binding*/ ctx[42](null);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
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

    function formatTime(sec) {
    	const minutes = Math.floor(sec / 60.0);
    	const seconds = Math.floor(sec % 60.0);
    	const sentiseconds = Math.floor(sec % 60.0 % 1 * 100);
    	const res = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") + ":" + String(sentiseconds).padStart(2, "0");
    	return res;
    }

    function instance($$self, $$props, $$invalidate) {
    	let containerWidth;
    	let containerHeight;
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
    	let defaultSize = "0x0";
    	let gsap;
    	let timelineIDs;
    	let currentTimelineID;
    	let currentTimeline;
    	let timelineEnabled = true;
    	let paused = false;
    	let timelineProgress = 0.0;
    	let bannerTime = 0.0;
    	let displayTime;
    	let displayDuration;
    	let showOverlay = false;
    	let inProgress = false;
    	let showCapture = false;
    	let capturedVideo = false;
    	let captureFilename;
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

    		$$invalidate(3, banner.onload = bannerOnLoad, banner);

    		observer = new ResizeObserver(mutations => {
    				bannerWidth = mutations[0].contentRect.width;
    				bannerHeight = mutations[0].contentRect.height;
    				$$invalidate(0, bannerWidthProp = bannerWidth);
    				$$invalidate(1, bannerHeightProp = bannerHeight);
    			});

    		observer.observe(bannerContainer);
    	});

    	function bannerOnLoad(event) {
    		console.log("Banner loaded");
    		const bannerWindow = banner.contentWindow;
    		const bannerDocument = bannerWindow.document;
    		bannerInternalContainer = bannerDocument.getElementById("container");

    		if (bannerInternalContainer) {
    			const style = bannerWindow.getComputedStyle(bannerInternalContainer);
    			const w = style.getPropertyValue("width").replace(/px/g, "");
    			const h = style.getPropertyValue("height").replace(/px/g, "");
    			$$invalidate(8, defaultSize = `${w}x${h}`);
    			$$invalidate(5, bannerDefaultWidth = bannerInternalContainer.offsetWidth);
    			$$invalidate(6, bannerDefaultHeight = bannerInternalContainer.offsetHeight);
    			bannerResetSize();
    		}

    		//
    		gsap = banner.contentWindow.gsap;

    		if (gsap) {
    			gsap.globalTimeline.pause();
    			$$invalidate(9, timelineIDs = Array.from(gsap.globalTimeline.getChildren().filter(c => c.constructor.name === "Timeline" && c.vars.id !== undefined).map(c => c.vars.id)));
    			currentTimeline = gsap.getById("MASTER");

    			if (currentTimeline === undefined) {
    				$$invalidate(11, timelineEnabled = false);
    			} else {
    				$$invalidate(10, currentTimelineID = "MASTER");
    				console.log(currentTimeline.duration());
    				if (currentTimeline.duration() === 0.0) $$invalidate(11, timelineEnabled = false);
    			}

    			$$invalidate(12, paused = !timelineEnabled);
    		} else {
    			$$invalidate(11, timelineEnabled = false);
    			$$invalidate(12, paused = true);
    		}

    		printTime();

    		if (timelineEnabled && currentTimeline) {
    			currentTimeline.pause();
    			window.requestAnimationFrame(step);
    		}

    		// 
    		const style = bannerDocument.createElement("style");

    		bannerDocument.head.appendChild(style);
    		style.type = "text/css";
    		style.textContent = "#__bs_notify__ { opacity: 0; } #link, #container { left: 0; right: auto; margin: 0; }";
    		bannerDocument.querySelectorAll(".dev, .gs-dev-tools, [preview]").forEach(elem => elem.remove());
    	}

    	let start = null;
    	let prevTime = 0.0;

    	function step(timestamp) {
    		if (!start) start = timestamp;
    		const time = timestamp - start;
    		const timeStep = (time - prevTime) / 1000;
    		prevTime = time;

    		if (currentTimeline) {
    			$$invalidate(13, timelineProgress += timeStep / currentTimeline.duration());

    			if (timelineProgress >= 1.0) {
    				$$invalidate(13, timelineProgress = 0.0);
    				start = null;
    				prevTime = 0.0;
    			}

    			currentTimeline.progress(timelineProgress);
    			$$invalidate(14, bannerTime = timelineProgress * currentTimeline.duration());
    			printTime();
    		}

    		if (!paused) window.requestAnimationFrame(step); else {
    			start = null;
    			prevTime = 0.0;
    		}
    	}

    	function bannerSizeChange(event) {
    		observer.disconnect();
    		$$invalidate(2, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(2, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    		observer.observe(bannerContainer);
    	}

    	function bannerSrcKeyPress(event) {
    		if (event.charCode === 13) {
    			loadBanner();
    		}
    	}

    	function loadBanner() {
    		$$invalidate(3, banner.src = "", banner);
    		$$invalidate(3, banner.src = bannerURL, banner);
    	}

    	function bannerDeviceChange() {
    		let screen = screens[bannerDevice];
    		$$invalidate(0, bannerWidthProp = screen.width);
    		$$invalidate(1, bannerHeightProp = screen.height);
    		$$invalidate(2, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(2, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	function bannerResetSize() {
    		$$invalidate(0, bannerWidthProp = bannerDefaultWidth);
    		$$invalidate(1, bannerHeightProp = bannerDefaultHeight);
    		$$invalidate(2, bannerContainer.style.width = bannerWidthProp + "px", bannerContainer);
    		$$invalidate(2, bannerContainer.style.height = bannerHeightProp + "px", bannerContainer);
    	}

    	function tabChange(event) {
    		$$invalidate(25, currentTab = event.detail.tab);
    	}

    	function toolOpen(event) {
    		$$invalidate(24, toolURL = event.detail.url);
    		console.log(toolURL);
    		$$invalidate(17, showOverlay = true);
    		$$invalidate(22, showToolWindow = true);
    	}

    	function closeOverlay() {
    		$$invalidate(17, showOverlay = false);
    		$$invalidate(19, showCapture = false);
    		$$invalidate(22, showToolWindow = false);
    	}

    	function captureStart(event) {
    		$$invalidate(18, inProgress = true);
    		$$invalidate(17, showOverlay = true);
    	}

    	function captureReady(event) {
    		$$invalidate(18, inProgress = false);
    		const capture = event.detail.capture;

    		if (capture && capture.haveResult) {
    			$$invalidate(20, capturedVideo = capture.video);
    			$$invalidate(21, captureFilename = "/file?path=capture/" + capture.filename + "&" + new Date().getTime());
    			$$invalidate(19, showCapture = true);
    		} else {
    			$$invalidate(19, showCapture = false);
    			$$invalidate(17, showOverlay = false);
    		}
    	}

    	function buildStart(event) {
    		$$invalidate(18, inProgress = true);
    		$$invalidate(17, showOverlay = true);
    	}

    	function buildReady(event) {
    		$$invalidate(18, inProgress = false);
    		event.detail.build;

    		// TODO: show build result
    		$$invalidate(17, showOverlay = false);
    	}

    	function togglePause() {
    		if (!timelineEnabled) return;

    		if (!paused) $$invalidate(12, paused = true); else {
    			$$invalidate(12, paused = false);
    			window.requestAnimationFrame(step);
    		}
    	}

    	function timelineChange() {
    		if (paused && timelineEnabled) {
    			currentTimeline.progress(timelineProgress);
    			$$invalidate(14, bannerTime = timelineProgress * currentTimeline.duration());
    			printTime();
    		}
    	}

    	function printTime() {
    		if (timelineEnabled) {
    			const totalSeconds = timelineProgress * currentTimeline.duration();
    			$$invalidate(15, displayTime = formatTime(totalSeconds));
    			$$invalidate(16, displayDuration = formatTime(currentTimeline.duration()));
    		} else {
    			$$invalidate(15, displayTime = "00:00:00");
    			$$invalidate(16, displayDuration = "00:00:00");
    		}
    	}

    	function timelineIDChange() {
    		console.log(currentTimelineID);
    		currentTimeline = gsap.getById(currentTimelineID);
    		console.log(currentTimeline.duration());
    		$$invalidate(11, timelineEnabled = currentTimeline.duration() !== 0.0);
    		$$invalidate(13, timelineProgress = 0.0);
    		start = null;
    		prevTime = 0.0;
    		$$invalidate(12, paused = true);
    		printTime();
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function iframe_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			banner = $$value;
    			$$invalidate(3, banner);
    		});
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			bannerContainer = $$value;
    			$$invalidate(2, bannerContainer);
    		});
    	}

    	function input0_input_handler() {
    		bannerURL = this.value;
    		$$invalidate(4, bannerURL);
    	}

    	function input2_input_handler() {
    		bannerWidthProp = to_number(this.value);
    		$$invalidate(0, bannerWidthProp);
    	}

    	function input3_input_handler() {
    		bannerHeightProp = to_number(this.value);
    		$$invalidate(1, bannerHeightProp);
    	}

    	function select0_change_handler() {
    		bannerDevice = select_value(this);
    		$$invalidate(7, bannerDevice);
    	}

    	function select1_change_handler() {
    		currentTimelineID = select_value(this);
    		$$invalidate(10, currentTimelineID);
    		$$invalidate(9, timelineIDs);
    	}

    	function input6_change_input_handler() {
    		timelineProgress = to_number(this.value);
    		$$invalidate(13, timelineProgress);
    	}

    	function iframe_binding_1($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			toolFrame = $$value;
    			$$invalidate(23, toolFrame);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		Tabs,
    		Tools,
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
    		defaultSize,
    		gsap,
    		timelineIDs,
    		currentTimelineID,
    		currentTimeline,
    		timelineEnabled,
    		paused,
    		timelineProgress,
    		bannerTime,
    		displayTime,
    		displayDuration,
    		showOverlay,
    		inProgress,
    		showCapture,
    		capturedVideo,
    		captureFilename,
    		showToolWindow,
    		toolFrame,
    		toolURL,
    		observer,
    		currentTab,
    		apiRequest,
    		bannerOnLoad,
    		start,
    		prevTime,
    		step,
    		bannerSizeChange,
    		bannerSrcKeyPress,
    		loadBanner,
    		bannerDeviceChange,
    		bannerResetSize,
    		tabChange,
    		toolOpen,
    		closeOverlay,
    		captureStart,
    		captureReady,
    		buildStart,
    		buildReady,
    		togglePause,
    		timelineChange,
    		printTime,
    		formatTime,
    		timelineIDChange,
    		containerHeight,
    		containerWidth
    	});

    	$$self.$inject_state = $$props => {
    		if ('sse' in $$props) sse = $$props.sse;
    		if ('bannerContainer' in $$props) $$invalidate(2, bannerContainer = $$props.bannerContainer);
    		if ('banner' in $$props) $$invalidate(3, banner = $$props.banner);
    		if ('bannerURL' in $$props) $$invalidate(4, bannerURL = $$props.bannerURL);
    		if ('bannerInternalContainer' in $$props) bannerInternalContainer = $$props.bannerInternalContainer;
    		if ('bannerDefaultWidth' in $$props) $$invalidate(5, bannerDefaultWidth = $$props.bannerDefaultWidth);
    		if ('bannerDefaultHeight' in $$props) $$invalidate(6, bannerDefaultHeight = $$props.bannerDefaultHeight);
    		if ('bannerWidth' in $$props) bannerWidth = $$props.bannerWidth;
    		if ('bannerHeight' in $$props) bannerHeight = $$props.bannerHeight;
    		if ('bannerWidthProp' in $$props) $$invalidate(0, bannerWidthProp = $$props.bannerWidthProp);
    		if ('bannerHeightProp' in $$props) $$invalidate(1, bannerHeightProp = $$props.bannerHeightProp);
    		if ('bannerDevice' in $$props) $$invalidate(7, bannerDevice = $$props.bannerDevice);
    		if ('defaultSize' in $$props) $$invalidate(8, defaultSize = $$props.defaultSize);
    		if ('gsap' in $$props) gsap = $$props.gsap;
    		if ('timelineIDs' in $$props) $$invalidate(9, timelineIDs = $$props.timelineIDs);
    		if ('currentTimelineID' in $$props) $$invalidate(10, currentTimelineID = $$props.currentTimelineID);
    		if ('currentTimeline' in $$props) currentTimeline = $$props.currentTimeline;
    		if ('timelineEnabled' in $$props) $$invalidate(11, timelineEnabled = $$props.timelineEnabled);
    		if ('paused' in $$props) $$invalidate(12, paused = $$props.paused);
    		if ('timelineProgress' in $$props) $$invalidate(13, timelineProgress = $$props.timelineProgress);
    		if ('bannerTime' in $$props) $$invalidate(14, bannerTime = $$props.bannerTime);
    		if ('displayTime' in $$props) $$invalidate(15, displayTime = $$props.displayTime);
    		if ('displayDuration' in $$props) $$invalidate(16, displayDuration = $$props.displayDuration);
    		if ('showOverlay' in $$props) $$invalidate(17, showOverlay = $$props.showOverlay);
    		if ('inProgress' in $$props) $$invalidate(18, inProgress = $$props.inProgress);
    		if ('showCapture' in $$props) $$invalidate(19, showCapture = $$props.showCapture);
    		if ('capturedVideo' in $$props) $$invalidate(20, capturedVideo = $$props.capturedVideo);
    		if ('captureFilename' in $$props) $$invalidate(21, captureFilename = $$props.captureFilename);
    		if ('showToolWindow' in $$props) $$invalidate(22, showToolWindow = $$props.showToolWindow);
    		if ('toolFrame' in $$props) $$invalidate(23, toolFrame = $$props.toolFrame);
    		if ('toolURL' in $$props) $$invalidate(24, toolURL = $$props.toolURL);
    		if ('observer' in $$props) observer = $$props.observer;
    		if ('currentTab' in $$props) $$invalidate(25, currentTab = $$props.currentTab);
    		if ('start' in $$props) start = $$props.start;
    		if ('prevTime' in $$props) prevTime = $$props.prevTime;
    		if ('containerHeight' in $$props) containerHeight = $$props.containerHeight;
    		if ('containerWidth' in $$props) containerWidth = $$props.containerWidth;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*bannerWidthProp*/ 1) {
    			containerWidth = bannerWidthProp;
    		}

    		if ($$self.$$.dirty[0] & /*bannerHeightProp*/ 2) {
    			containerHeight = bannerHeightProp;
    		}
    	};

    	return [
    		bannerWidthProp,
    		bannerHeightProp,
    		bannerContainer,
    		banner,
    		bannerURL,
    		bannerDefaultWidth,
    		bannerDefaultHeight,
    		bannerDevice,
    		defaultSize,
    		timelineIDs,
    		currentTimelineID,
    		timelineEnabled,
    		paused,
    		timelineProgress,
    		bannerTime,
    		displayTime,
    		displayDuration,
    		showOverlay,
    		inProgress,
    		showCapture,
    		capturedVideo,
    		captureFilename,
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
    		captureStart,
    		captureReady,
    		buildStart,
    		buildReady,
    		togglePause,
    		timelineChange,
    		timelineIDChange,
    		iframe_binding,
    		div2_binding,
    		input0_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		select0_change_handler,
    		select1_change_handler,
    		input6_change_input_handler,
    		iframe_binding_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1, -1]);

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
