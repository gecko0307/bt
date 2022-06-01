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

    /* src\ImageSettings.svelte generated by Svelte v3.47.0 */
    const file$1 = "src\\ImageSettings.svelte";

    // (49:16) {#if canConvertToPNG}
    function create_if_block_8(ctx) {
    	let option;

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.textContent = "PNG";
    			option.__value = "png";
    			option.value = option.__value;
    			add_location(option, file$1, 49, 20, 1808);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(49:16) {#if canConvertToPNG}",
    		ctx
    	});

    	return block;
    }

    // (52:16) {#if canConvertToJPEG}
    function create_if_block_7(ctx) {
    	let option;

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.textContent = "JPEG";
    			option.__value = "jpg";
    			option.value = option.__value;
    			add_location(option, file$1, 52, 20, 1925);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(52:16) {#if canConvertToJPEG}",
    		ctx
    	});

    	return block;
    }

    // (55:16) {#if canConvertToWebP}
    function create_if_block_6(ctx) {
    	let option;

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.textContent = "WebP";
    			option.__value = "webp";
    			option.value = option.__value;
    			add_location(option, file$1, 55, 20, 2043);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(55:16) {#if canConvertToWebP}",
    		ctx
    	});

    	return block;
    }

    // (58:16) {#if canConvertToSVG}
    function create_if_block_5(ctx) {
    	let option;

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.textContent = "SVG";
    			option.__value = "svg";
    			option.value = option.__value;
    			add_location(option, file$1, 58, 20, 2161);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(58:16) {#if canConvertToSVG}",
    		ctx
    	});

    	return block;
    }

    // (64:8) {#if !data.options.compress.lossless && !(inputFormat === "svg" && data.options.outputFormat === "svg")}
    function create_if_block_4$1(ctx) {
    	let div0;
    	let p;
    	let t0;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			p = element("p");
    			t0 = text(/*qualityText*/ ctx[3]);
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			input1 = element("input");
    			add_location(p, file$1, 65, 16, 2433);
    			attr_dev(input0, "type", "range");
    			attr_dev(input0, "min", "1");
    			attr_dev(input0, "max", "100");
    			attr_dev(input0, "step", "1");
    			attr_dev(input0, "class", "svelte-1aq5akd");
    			add_location(input0, file$1, 66, 16, 2471);
    			attr_dev(div0, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div0, file$1, 64, 12, 2385);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "max", "100");
    			attr_dev(input1, "step", "1");
    			attr_dev(input1, "class", "svelte-1aq5akd");
    			add_location(input1, file$1, 69, 16, 2652);
    			attr_dev(div1, "class", "widget anyFormat svelte-1aq5akd");
    			set_style(div1, "padding-top", "14px");
    			add_location(div1, file$1, 68, 12, 2578);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p);
    			append_dev(p, t0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*data*/ ctx[0].quality);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input1);
    			set_input_value(input1, /*data*/ ctx[0].quality);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_input_handler*/ ctx[14]),
    					listen_dev(input0, "input", /*input0_change_input_handler*/ ctx[14]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*qualityText*/ 8) set_data_dev(t0, /*qualityText*/ ctx[3]);

    			if (dirty & /*data*/ 1) {
    				set_input_value(input0, /*data*/ ctx[0].quality);
    			}

    			if (dirty & /*data*/ 1 && to_number(input1.value) !== /*data*/ ctx[0].quality) {
    				set_input_value(input1, /*data*/ ctx[0].quality);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(64:8) {#if !data.options.compress.lossless && !(inputFormat === \\\"svg\\\" && data.options.outputFormat === \\\"svg\\\")}",
    		ctx
    	});

    	return block;
    }

    // (100:8) {#if (data.options.outputFormat === "png" && !data.options.compress.lossless) || (inputFormat === "png" && data.options.outputFormat === "svg")}
    function create_if_block_3$1(ctx) {
    	let div0;
    	let p0;
    	let t1;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let option8;
    	let option9;
    	let option10;
    	let t13;
    	let div1;
    	let p1;
    	let t15;
    	let select1;
    	let option11;
    	let option12;
    	let option13;
    	let option14;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Dithering";
    			t1 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Nearest";
    			option1 = element("option");
    			option1.textContent = "Riemersma";
    			option2 = element("option");
    			option2.textContent = "Floyd-Steinberg";
    			option3 = element("option");
    			option3.textContent = "False Floyd-Steinberg";
    			option4 = element("option");
    			option4.textContent = "Stucki";
    			option5 = element("option");
    			option5.textContent = "Atkinson";
    			option6 = element("option");
    			option6.textContent = "Burkes";
    			option7 = element("option");
    			option7.textContent = "Sierra";
    			option8 = element("option");
    			option8.textContent = "Two-Sierra";
    			option9 = element("option");
    			option9.textContent = "Sierra Lite";
    			option10 = element("option");
    			option10.textContent = "Jarvis";
    			t13 = space();
    			div1 = element("div");
    			p1 = element("p");
    			p1.textContent = "Palette quantization";
    			t15 = space();
    			select1 = element("select");
    			option11 = element("option");
    			option11.textContent = "NeuQuant";
    			option12 = element("option");
    			option12.textContent = "NeuQuant (float)";
    			option13 = element("option");
    			option13.textContent = "RGBQuant";
    			option14 = element("option");
    			option14.textContent = "WuQuant";
    			add_location(p0, file$1, 101, 16, 3962);
    			option0.__value = "nearest";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 103, 20, 4076);
    			option1.__value = "riemersma";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 104, 20, 4138);
    			option2.__value = "floyd-steinberg";
    			option2.value = option2.__value;
    			add_location(option2, file$1, 105, 20, 4204);
    			option3.__value = "false-floyd-steinberg";
    			option3.value = option3.__value;
    			add_location(option3, file$1, 106, 20, 4282);
    			option4.__value = "stucki";
    			option4.value = option4.__value;
    			add_location(option4, file$1, 107, 20, 4372);
    			option5.__value = "atkinson";
    			option5.value = option5.__value;
    			option5.selected = true;
    			add_location(option5, file$1, 108, 20, 4432);
    			option6.__value = "burkes";
    			option6.value = option6.__value;
    			add_location(option6, file$1, 109, 20, 4505);
    			option7.__value = "sierra";
    			option7.value = option7.__value;
    			add_location(option7, file$1, 110, 20, 4565);
    			option8.__value = "two-sierra";
    			option8.value = option8.__value;
    			add_location(option8, file$1, 111, 20, 4625);
    			option9.__value = "sierra-lite";
    			option9.value = option9.__value;
    			add_location(option9, file$1, 112, 20, 4693);
    			option10.__value = "jarvis";
    			option10.value = option10.__value;
    			add_location(option10, file$1, 113, 20, 4763);
    			if (/*data*/ ctx[0].options.compress.imageDithering === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[20].call(select0));
    			add_location(select0, file$1, 102, 16, 3996);
    			attr_dev(div0, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div0, file$1, 100, 12, 3914);
    			add_location(p1, file$1, 117, 16, 4910);
    			option11.__value = "neuquant";
    			option11.value = option11.__value;
    			add_location(option11, file$1, 119, 20, 5037);
    			option12.__value = "neuquant-float";
    			option12.value = option12.__value;
    			add_location(option12, file$1, 120, 20, 5101);
    			option13.__value = "rgbquant";
    			option13.value = option13.__value;
    			add_location(option13, file$1, 121, 20, 5179);
    			option14.__value = "wuquant";
    			option14.value = option14.__value;
    			option14.selected = true;
    			add_location(option14, file$1, 122, 20, 5243);
    			if (/*data*/ ctx[0].options.compress.paletteDithering === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[21].call(select1));
    			add_location(select1, file$1, 118, 16, 4955);
    			attr_dev(div1, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div1, file$1, 116, 12, 4862);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			append_dev(div0, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			append_dev(select0, option3);
    			append_dev(select0, option4);
    			append_dev(select0, option5);
    			append_dev(select0, option6);
    			append_dev(select0, option7);
    			append_dev(select0, option8);
    			append_dev(select0, option9);
    			append_dev(select0, option10);
    			select_option(select0, /*data*/ ctx[0].options.compress.imageDithering);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p1);
    			append_dev(div1, t15);
    			append_dev(div1, select1);
    			append_dev(select1, option11);
    			append_dev(select1, option12);
    			append_dev(select1, option13);
    			append_dev(select1, option14);
    			select_option(select1, /*data*/ ctx[0].options.compress.paletteDithering);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[20]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[21])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1) {
    				select_option(select0, /*data*/ ctx[0].options.compress.imageDithering);
    			}

    			if (dirty & /*data*/ 1) {
    				select_option(select1, /*data*/ ctx[0].options.compress.paletteDithering);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(100:8) {#if (data.options.outputFormat === \\\"png\\\" && !data.options.compress.lossless) || (inputFormat === \\\"png\\\" && data.options.outputFormat === \\\"svg\\\")}",
    		ctx
    	});

    	return block;
    }

    // (128:8) {#if inputFormat === "svg" && data.options.outputFormat === "jpg" }
    function create_if_block_2$1(ctx) {
    	let div;
    	let p;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "Background";
    			t1 = space();
    			input = element("input");
    			add_location(p, file$1, 129, 16, 5495);
    			attr_dev(input, "type", "color");
    			add_location(input, file$1, 130, 16, 5530);
    			attr_dev(div, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div, file$1, 128, 12, 5447);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(div, t1);
    			append_dev(div, input);
    			set_input_value(input, /*data*/ ctx[0].options.compress.backgroundColor);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler*/ ctx[22]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1) {
    				set_input_value(input, /*data*/ ctx[0].options.compress.backgroundColor);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(128:8) {#if inputFormat === \\\"svg\\\" && data.options.outputFormat === \\\"jpg\\\" }",
    		ctx
    	});

    	return block;
    }

    // (135:8) {#if inputFormat === "svg" && data.options.outputFormat !== "svg" }
    function create_if_block_1$1(ctx) {
    	let div0;
    	let p0;
    	let t1;
    	let input0;
    	let t2;
    	let div1;
    	let p1;
    	let t4;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Width";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			p1 = element("p");
    			p1.textContent = "Height";
    			t4 = space();
    			input1 = element("input");
    			add_location(p0, file$1, 136, 16, 5778);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "1");
    			attr_dev(input0, "step", "1");
    			attr_dev(input0, "class", "svelte-1aq5akd");
    			add_location(input0, file$1, 137, 16, 5808);
    			attr_dev(div0, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div0, file$1, 135, 12, 5730);
    			add_location(p1, file$1, 140, 16, 5966);
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "min", "1");
    			attr_dev(input1, "step", "1");
    			attr_dev(input1, "class", "svelte-1aq5akd");
    			add_location(input1, file$1, 141, 16, 5997);
    			attr_dev(div1, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div1, file$1, 139, 12, 5918);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, p0);
    			append_dev(div0, t1);
    			append_dev(div0, input0);
    			set_input_value(input0, /*data*/ ctx[0].options.outputWidth);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p1);
    			append_dev(div1, t4);
    			append_dev(div1, input1);
    			set_input_value(input1, /*data*/ ctx[0].options.outputHeight);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[23]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[24])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && to_number(input0.value) !== /*data*/ ctx[0].options.outputWidth) {
    				set_input_value(input0, /*data*/ ctx[0].options.outputWidth);
    			}

    			if (dirty & /*data*/ 1 && to_number(input1.value) !== /*data*/ ctx[0].options.outputHeight) {
    				set_input_value(input1, /*data*/ ctx[0].options.outputHeight);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(135:8) {#if inputFormat === \\\"svg\\\" && data.options.outputFormat !== \\\"svg\\\" }",
    		ctx
    	});

    	return block;
    }

    // (153:8) {#if data.options.compress.inline}
    function create_if_block$1(ctx) {
    	let div;
    	let p;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "CSS selector";
    			t1 = space();
    			input = element("input");
    			add_location(p, file$1, 154, 16, 6455);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "svelte-1aq5akd");
    			add_location(input, file$1, 155, 16, 6492);
    			attr_dev(div, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div, file$1, 153, 12, 6407);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(div, t1);
    			append_dev(div, input);
    			set_input_value(input, /*data*/ ctx[0].options.compress.selector);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_input_handler_1*/ ctx[26]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && input.value !== /*data*/ ctx[0].options.compress.selector) {
    				set_input_value(input, /*data*/ ctx[0].options.compress.selector);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(153:8) {#if data.options.compress.inline}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let main;
    	let div7;
    	let div0;
    	let a;
    	let img;
    	let img_src_value;
    	let a_href_value;
    	let t0;
    	let div1;
    	let p;
    	let t2;
    	let select;
    	let if_block0_anchor;
    	let if_block1_anchor;
    	let if_block2_anchor;
    	let t3;
    	let t4;
    	let div2;
    	let label0;
    	let input0;
    	let t5;
    	let t6;
    	let div3;
    	let label1;
    	let input1;
    	let t7;
    	let t8;
    	let div4;
    	let label2;
    	let input2;
    	let t9;
    	let t10;
    	let div5;
    	let label3;
    	let input3;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let div6;
    	let label4;
    	let input4;
    	let t16;
    	let t17;
    	let mounted;
    	let dispose;
    	let if_block0 = /*canConvertToPNG*/ ctx[11] && create_if_block_8(ctx);
    	let if_block1 = /*canConvertToJPEG*/ ctx[10] && create_if_block_7(ctx);
    	let if_block2 = /*canConvertToWebP*/ ctx[9] && create_if_block_6(ctx);
    	let if_block3 = /*canConvertToSVG*/ ctx[8] && create_if_block_5(ctx);
    	let if_block4 = !/*data*/ ctx[0].options.compress.lossless && !(/*inputFormat*/ ctx[2] === "svg" && /*data*/ ctx[0].options.outputFormat === "svg") && create_if_block_4$1(ctx);
    	let if_block5 = (/*data*/ ctx[0].options.outputFormat === "png" && !/*data*/ ctx[0].options.compress.lossless || /*inputFormat*/ ctx[2] === "png" && /*data*/ ctx[0].options.outputFormat === "svg") && create_if_block_3$1(ctx);
    	let if_block6 = /*inputFormat*/ ctx[2] === "svg" && /*data*/ ctx[0].options.outputFormat === "jpg" && create_if_block_2$1(ctx);
    	let if_block7 = /*inputFormat*/ ctx[2] === "svg" && /*data*/ ctx[0].options.outputFormat !== "svg" && create_if_block_1$1(ctx);
    	let if_block8 = /*data*/ ctx[0].options.compress.inline && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div7 = element("div");
    			div0 = element("div");
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Output format";
    			t2 = space();
    			select = element("select");
    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			if (if_block4) if_block4.c();
    			t4 = space();
    			div2 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t5 = text("Progressive");
    			t6 = space();
    			div3 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t7 = text("\r\n                Grayscale");
    			t8 = space();
    			div4 = element("div");
    			label2 = element("label");
    			input2 = element("input");
    			t9 = text("\r\n                Pretty");
    			t10 = space();
    			div5 = element("div");
    			label3 = element("label");
    			input3 = element("input");
    			t11 = text("\r\n                Lossless");
    			t12 = space();
    			if (if_block5) if_block5.c();
    			t13 = space();
    			if (if_block6) if_block6.c();
    			t14 = space();
    			if (if_block7) if_block7.c();
    			t15 = space();
    			div6 = element("div");
    			label4 = element("label");
    			input4 = element("input");
    			t16 = text("\r\n                Inline");
    			t17 = space();
    			if (if_block8) if_block8.c();
    			attr_dev(img, "class", "thumb_image svelte-1aq5akd");
    			if (!src_url_equal(img.src, img_src_value = "/file?path=" + /*imagePath*/ ctx[12])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*filename*/ ctx[1]);
    			add_location(img, file$1, 41, 16, 1505);
    			attr_dev(a, "href", a_href_value = "/file?path=" + /*imagePath*/ ctx[12]);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$1, 40, 12, 1438);
    			attr_dev(div0, "class", "thumb svelte-1aq5akd");
    			add_location(div0, file$1, 39, 8, 1405);
    			add_location(p, file$1, 46, 12, 1666);
    			if (/*data*/ ctx[0].options.outputFormat === void 0) add_render_callback(() => /*select_change_handler*/ ctx[13].call(select));
    			add_location(select, file$1, 47, 12, 1700);
    			attr_dev(div1, "class", "widget anyFormat svelte-1aq5akd");
    			add_location(div1, file$1, 45, 8, 1622);
    			attr_dev(input0, "type", "checkbox");
    			attr_dev(input0, "class", "svelte-1aq5akd");
    			add_location(input0, file$1, 75, 16, 2872);
    			add_location(label0, file$1, 74, 12, 2847);
    			attr_dev(div2, "class", "widget svelte-1aq5akd");
    			set_style(div2, "padding-top", "14px");
    			toggle_class(div2, "jpgOnly", /*jpgOnly*/ ctx[6]);
    			add_location(div2, file$1, 73, 8, 2773);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "class", "svelte-1aq5akd");
    			add_location(input1, file$1, 80, 16, 3104);
    			add_location(label1, file$1, 79, 12, 3079);
    			attr_dev(div3, "class", "widget svelte-1aq5akd");
    			set_style(div3, "padding-top", "14px");
    			toggle_class(div3, "jpgOnly", /*jpgOnly*/ ctx[6]);
    			add_location(div3, file$1, 78, 8, 3005);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "class", "svelte-1aq5akd");
    			add_location(input2, file$1, 87, 16, 3352);
    			add_location(label2, file$1, 86, 12, 3327);
    			attr_dev(div4, "class", "widget svelte-1aq5akd");
    			set_style(div4, "padding-top", "14px");
    			toggle_class(div4, "svgOnly", /*svgOnly*/ ctx[5]);
    			add_location(div4, file$1, 85, 8, 3253);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "class", "svelte-1aq5akd");
    			add_location(input3, file$1, 94, 16, 3609);
    			add_location(label3, file$1, 93, 12, 3584);
    			attr_dev(div5, "class", "widget svelte-1aq5akd");
    			set_style(div5, "padding-top", "14px");
    			toggle_class(div5, "pngOnly", /*pngOnly*/ ctx[7]);
    			toggle_class(div5, "webpOnly", /*webpOnly*/ ctx[4]);
    			add_location(div5, file$1, 92, 8, 3495);
    			attr_dev(input4, "type", "checkbox");
    			attr_dev(input4, "class", "svelte-1aq5akd");
    			add_location(input4, file$1, 147, 16, 6216);
    			add_location(label4, file$1, 146, 12, 6191);
    			attr_dev(div6, "class", "widget anyFormat svelte-1aq5akd");
    			set_style(div6, "padding-top", "14px");
    			add_location(div6, file$1, 145, 8, 6121);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$1, 38, 4, 1378);
    			attr_dev(main, "class", "svelte-1aq5akd");
    			add_location(main, file$1, 37, 0, 1366);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div7);
    			append_dev(div7, div0);
    			append_dev(div0, a);
    			append_dev(a, img);
    			append_dev(div7, t0);
    			append_dev(div7, div1);
    			append_dev(div1, p);
    			append_dev(div1, t2);
    			append_dev(div1, select);
    			if (if_block0) if_block0.m(select, null);
    			append_dev(select, if_block0_anchor);
    			if (if_block1) if_block1.m(select, null);
    			append_dev(select, if_block1_anchor);
    			if (if_block2) if_block2.m(select, null);
    			append_dev(select, if_block2_anchor);
    			if (if_block3) if_block3.m(select, null);
    			select_option(select, /*data*/ ctx[0].options.outputFormat);
    			append_dev(div7, t3);
    			if (if_block4) if_block4.m(div7, null);
    			append_dev(div7, t4);
    			append_dev(div7, div2);
    			append_dev(div2, label0);
    			append_dev(label0, input0);
    			input0.checked = /*data*/ ctx[0].options.compress.progressive;
    			append_dev(label0, t5);
    			append_dev(div7, t6);
    			append_dev(div7, div3);
    			append_dev(div3, label1);
    			append_dev(label1, input1);
    			input1.checked = /*data*/ ctx[0].options.compress.grayscale;
    			append_dev(label1, t7);
    			append_dev(div7, t8);
    			append_dev(div7, div4);
    			append_dev(div4, label2);
    			append_dev(label2, input2);
    			input2.checked = /*data*/ ctx[0].options.compress.pretty;
    			append_dev(label2, t9);
    			append_dev(div7, t10);
    			append_dev(div7, div5);
    			append_dev(div5, label3);
    			append_dev(label3, input3);
    			input3.checked = /*data*/ ctx[0].options.compress.lossless;
    			append_dev(label3, t11);
    			append_dev(div7, t12);
    			if (if_block5) if_block5.m(div7, null);
    			append_dev(div7, t13);
    			if (if_block6) if_block6.m(div7, null);
    			append_dev(div7, t14);
    			if (if_block7) if_block7.m(div7, null);
    			append_dev(div7, t15);
    			append_dev(div7, div6);
    			append_dev(div6, label4);
    			append_dev(label4, input4);
    			input4.checked = /*data*/ ctx[0].options.compress.inline;
    			append_dev(label4, t16);
    			append_dev(div7, t17);
    			if (if_block8) if_block8.m(div7, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*select_change_handler*/ ctx[13]),
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[16]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[17]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[18]),
    					listen_dev(input3, "change", /*input3_change_handler*/ ctx[19]),
    					listen_dev(input4, "change", /*input4_change_handler*/ ctx[25])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imagePath*/ 4096 && !src_url_equal(img.src, img_src_value = "/file?path=" + /*imagePath*/ ctx[12])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*filename*/ 2) {
    				attr_dev(img, "alt", /*filename*/ ctx[1]);
    			}

    			if (dirty & /*imagePath*/ 4096 && a_href_value !== (a_href_value = "/file?path=" + /*imagePath*/ ctx[12])) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (/*canConvertToPNG*/ ctx[11]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_8(ctx);
    					if_block0.c();
    					if_block0.m(select, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*canConvertToJPEG*/ ctx[10]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_7(ctx);
    					if_block1.c();
    					if_block1.m(select, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*canConvertToWebP*/ ctx[9]) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block_6(ctx);
    					if_block2.c();
    					if_block2.m(select, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*canConvertToSVG*/ ctx[8]) {
    				if (if_block3) ; else {
    					if_block3 = create_if_block_5(ctx);
    					if_block3.c();
    					if_block3.m(select, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (dirty & /*data*/ 1) {
    				select_option(select, /*data*/ ctx[0].options.outputFormat);
    			}

    			if (!/*data*/ ctx[0].options.compress.lossless && !(/*inputFormat*/ ctx[2] === "svg" && /*data*/ ctx[0].options.outputFormat === "svg")) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_4$1(ctx);
    					if_block4.c();
    					if_block4.m(div7, t4);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (dirty & /*data*/ 1) {
    				input0.checked = /*data*/ ctx[0].options.compress.progressive;
    			}

    			if (dirty & /*jpgOnly*/ 64) {
    				toggle_class(div2, "jpgOnly", /*jpgOnly*/ ctx[6]);
    			}

    			if (dirty & /*data*/ 1) {
    				input1.checked = /*data*/ ctx[0].options.compress.grayscale;
    			}

    			if (dirty & /*jpgOnly*/ 64) {
    				toggle_class(div3, "jpgOnly", /*jpgOnly*/ ctx[6]);
    			}

    			if (dirty & /*data*/ 1) {
    				input2.checked = /*data*/ ctx[0].options.compress.pretty;
    			}

    			if (dirty & /*svgOnly*/ 32) {
    				toggle_class(div4, "svgOnly", /*svgOnly*/ ctx[5]);
    			}

    			if (dirty & /*data*/ 1) {
    				input3.checked = /*data*/ ctx[0].options.compress.lossless;
    			}

    			if (dirty & /*pngOnly*/ 128) {
    				toggle_class(div5, "pngOnly", /*pngOnly*/ ctx[7]);
    			}

    			if (dirty & /*webpOnly*/ 16) {
    				toggle_class(div5, "webpOnly", /*webpOnly*/ ctx[4]);
    			}

    			if (/*data*/ ctx[0].options.outputFormat === "png" && !/*data*/ ctx[0].options.compress.lossless || /*inputFormat*/ ctx[2] === "png" && /*data*/ ctx[0].options.outputFormat === "svg") {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_3$1(ctx);
    					if_block5.c();
    					if_block5.m(div7, t13);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*inputFormat*/ ctx[2] === "svg" && /*data*/ ctx[0].options.outputFormat === "jpg") {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block_2$1(ctx);
    					if_block6.c();
    					if_block6.m(div7, t14);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*inputFormat*/ ctx[2] === "svg" && /*data*/ ctx[0].options.outputFormat !== "svg") {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);
    				} else {
    					if_block7 = create_if_block_1$1(ctx);
    					if_block7.c();
    					if_block7.m(div7, t15);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (dirty & /*data*/ 1) {
    				input4.checked = /*data*/ ctx[0].options.compress.inline;
    			}

    			if (/*data*/ ctx[0].options.compress.inline) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block$1(ctx);
    					if_block8.c();
    					if_block8.m(div7, null);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			mounted = false;
    			run_all(dispose);
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
    	let imagePath;
    	let inputFormat;
    	let canConvertToPNG;
    	let canConvertToJPEG;
    	let canConvertToWebP;
    	let canConvertToSVG;
    	let pngOnly;
    	let jpgOnly;
    	let svgOnly;
    	let webpOnly;
    	let qualityText;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ImageSettings', slots, []);
    	let { filename = "" } = $$props;
    	let { data = {} } = $$props;

    	function _qualityText(fmt) {
    		if (fmt === "webp") return "Quality"; else if (fmt === "jpg") return "Quality"; else if (fmt === "png") return "Quality"; else if (fmt === "svg") {
    			if (inputFormat === "png") return "Quality"; else return "Precision";
    		}
    	}

    	onMount(async () => {
    		
    	});

    	const writable_props = ['filename', 'data'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ImageSettings> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		data.options.outputFormat = select_value(this);
    		$$invalidate(0, data);
    	}

    	function input0_change_input_handler() {
    		data.quality = to_number(this.value);
    		$$invalidate(0, data);
    	}

    	function input1_input_handler() {
    		data.quality = to_number(this.value);
    		$$invalidate(0, data);
    	}

    	function input0_change_handler() {
    		data.options.compress.progressive = this.checked;
    		$$invalidate(0, data);
    	}

    	function input1_change_handler() {
    		data.options.compress.grayscale = this.checked;
    		$$invalidate(0, data);
    	}

    	function input2_change_handler() {
    		data.options.compress.pretty = this.checked;
    		$$invalidate(0, data);
    	}

    	function input3_change_handler() {
    		data.options.compress.lossless = this.checked;
    		$$invalidate(0, data);
    	}

    	function select0_change_handler() {
    		data.options.compress.imageDithering = select_value(this);
    		$$invalidate(0, data);
    	}

    	function select1_change_handler() {
    		data.options.compress.paletteDithering = select_value(this);
    		$$invalidate(0, data);
    	}

    	function input_input_handler() {
    		data.options.compress.backgroundColor = this.value;
    		$$invalidate(0, data);
    	}

    	function input0_input_handler() {
    		data.options.outputWidth = to_number(this.value);
    		$$invalidate(0, data);
    	}

    	function input1_input_handler_1() {
    		data.options.outputHeight = to_number(this.value);
    		$$invalidate(0, data);
    	}

    	function input4_change_handler() {
    		data.options.compress.inline = this.checked;
    		$$invalidate(0, data);
    	}

    	function input_input_handler_1() {
    		data.options.compress.selector = this.value;
    		$$invalidate(0, data);
    	}

    	$$self.$$set = $$props => {
    		if ('filename' in $$props) $$invalidate(1, filename = $$props.filename);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		filename,
    		data,
    		_qualityText,
    		inputFormat,
    		qualityText,
    		webpOnly,
    		svgOnly,
    		jpgOnly,
    		pngOnly,
    		canConvertToSVG,
    		canConvertToWebP,
    		canConvertToJPEG,
    		canConvertToPNG,
    		imagePath
    	});

    	$$self.$inject_state = $$props => {
    		if ('filename' in $$props) $$invalidate(1, filename = $$props.filename);
    		if ('data' in $$props) $$invalidate(0, data = $$props.data);
    		if ('inputFormat' in $$props) $$invalidate(2, inputFormat = $$props.inputFormat);
    		if ('qualityText' in $$props) $$invalidate(3, qualityText = $$props.qualityText);
    		if ('webpOnly' in $$props) $$invalidate(4, webpOnly = $$props.webpOnly);
    		if ('svgOnly' in $$props) $$invalidate(5, svgOnly = $$props.svgOnly);
    		if ('jpgOnly' in $$props) $$invalidate(6, jpgOnly = $$props.jpgOnly);
    		if ('pngOnly' in $$props) $$invalidate(7, pngOnly = $$props.pngOnly);
    		if ('canConvertToSVG' in $$props) $$invalidate(8, canConvertToSVG = $$props.canConvertToSVG);
    		if ('canConvertToWebP' in $$props) $$invalidate(9, canConvertToWebP = $$props.canConvertToWebP);
    		if ('canConvertToJPEG' in $$props) $$invalidate(10, canConvertToJPEG = $$props.canConvertToJPEG);
    		if ('canConvertToPNG' in $$props) $$invalidate(11, canConvertToPNG = $$props.canConvertToPNG);
    		if ('imagePath' in $$props) $$invalidate(12, imagePath = $$props.imagePath);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*filename*/ 2) {
    			$$invalidate(12, imagePath = "Images/" + filename);
    		}

    		if ($$self.$$.dirty & /*filename*/ 2) {
    			//$: outputFormat = data.options.outputFormat;
    			$$invalidate(2, inputFormat = filename.substring(filename.lastIndexOf(".") + 1));
    		}

    		if ($$self.$$.dirty & /*inputFormat*/ 4) {
    			$$invalidate(11, canConvertToPNG = inputFormat === "png" || inputFormat === "svg");
    		}

    		if ($$self.$$.dirty & /*inputFormat*/ 4) {
    			$$invalidate(10, canConvertToJPEG = inputFormat === "png" || inputFormat === "jpg" || inputFormat === "svg");
    		}

    		if ($$self.$$.dirty & /*inputFormat*/ 4) {
    			$$invalidate(9, canConvertToWebP = inputFormat === "png" || inputFormat === "jpg" || inputFormat === "svg" || inputFormat === "webp");
    		}

    		if ($$self.$$.dirty & /*inputFormat*/ 4) {
    			$$invalidate(8, canConvertToSVG = inputFormat === "png" || inputFormat === "svg");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(7, pngOnly = data.options.outputFormat === "png");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(6, jpgOnly = data.options.outputFormat === "jpg");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(5, svgOnly = data.options.outputFormat === "svg");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(4, webpOnly = data.options.outputFormat === "webp");
    		}

    		if ($$self.$$.dirty & /*data*/ 1) {
    			$$invalidate(3, qualityText = _qualityText(data.options.outputFormat));
    		}
    	};

    	return [
    		data,
    		filename,
    		inputFormat,
    		qualityText,
    		webpOnly,
    		svgOnly,
    		jpgOnly,
    		pngOnly,
    		canConvertToSVG,
    		canConvertToWebP,
    		canConvertToJPEG,
    		canConvertToPNG,
    		imagePath,
    		select_change_handler,
    		input0_change_input_handler,
    		input1_input_handler,
    		input0_change_handler,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		select0_change_handler,
    		select1_change_handler,
    		input_input_handler,
    		input0_input_handler,
    		input1_input_handler_1,
    		input4_change_handler,
    		input_input_handler_1
    	];
    }

    class ImageSettings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { filename: 1, data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ImageSettings",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get filename() {
    		throw new Error("<ImageSettings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filename(value) {
    		throw new Error("<ImageSettings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<ImageSettings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<ImageSettings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.47.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (101:12) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No images found in \"Images\" directory";
    			add_location(p, file, 101, 16, 3156);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(101:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (86:12) {#if images.length > 0}
    function create_if_block_3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*images*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

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
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*images, config*/ 3) {
    				each_value = /*images*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(86:12) {#if images.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (88:20) {#if imageFile in config.images}
    function create_if_block_4(ctx) {
    	let div;
    	let fieldset;
    	let legend;
    	let b;
    	let t0_value = /*imageFile*/ ctx[13] + "";
    	let t0;
    	let t1;
    	let t2_value = (/*config*/ ctx[1].images[/*imageFile*/ ctx[13]].compressed.unzipped / 1024).toFixed(2) + "";
    	let t2;
    	let t3;
    	let t4_value = (/*config*/ ctx[1].images[/*imageFile*/ ctx[13]].compressed.weight / 1024).toFixed(2) + "";
    	let t4;
    	let t5;
    	let t6;
    	let imagesettings;
    	let t7;
    	let current;

    	imagesettings = new ImageSettings({
    			props: {
    				filename: /*imageFile*/ ctx[13],
    				data: /*config*/ ctx[1].images[/*imageFile*/ ctx[13]]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			fieldset = element("fieldset");
    			legend = element("legend");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = text(" - \r\n                                    ");
    			t2 = text(t2_value);
    			t3 = text(" Kb / \r\n                                    ");
    			t4 = text(t4_value);
    			t5 = text(" Kb zip");
    			t6 = space();
    			create_component(imagesettings.$$.fragment);
    			t7 = space();
    			add_location(b, file, 91, 36, 2605);
    			add_location(legend, file, 90, 32, 2559);
    			add_location(fieldset, file, 89, 28, 2515);
    			attr_dev(div, "class", "image svelte-16ndu7x");
    			add_location(div, file, 88, 24, 2466);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, fieldset);
    			append_dev(fieldset, legend);
    			append_dev(legend, b);
    			append_dev(b, t0);
    			append_dev(legend, t1);
    			append_dev(legend, t2);
    			append_dev(legend, t3);
    			append_dev(legend, t4);
    			append_dev(legend, t5);
    			append_dev(fieldset, t6);
    			mount_component(imagesettings, fieldset, null);
    			append_dev(div, t7);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*images*/ 1) && t0_value !== (t0_value = /*imageFile*/ ctx[13] + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*config, images*/ 3) && t2_value !== (t2_value = (/*config*/ ctx[1].images[/*imageFile*/ ctx[13]].compressed.unzipped / 1024).toFixed(2) + "")) set_data_dev(t2, t2_value);
    			if ((!current || dirty & /*config, images*/ 3) && t4_value !== (t4_value = (/*config*/ ctx[1].images[/*imageFile*/ ctx[13]].compressed.weight / 1024).toFixed(2) + "")) set_data_dev(t4, t4_value);
    			const imagesettings_changes = {};
    			if (dirty & /*images*/ 1) imagesettings_changes.filename = /*imageFile*/ ctx[13];
    			if (dirty & /*config, images*/ 3) imagesettings_changes.data = /*config*/ ctx[1].images[/*imageFile*/ ctx[13]];
    			imagesettings.$set(imagesettings_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imagesettings.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imagesettings.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(imagesettings);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(88:20) {#if imageFile in config.images}",
    		ctx
    	});

    	return block;
    }

    // (87:16) {#each images as imageFile}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*imageFile*/ ctx[13] in /*config*/ ctx[1].images && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*imageFile*/ ctx[13] in /*config*/ ctx[1].images) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*images, config*/ 3) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
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
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(87:16) {#each images as imageFile}",
    		ctx
    	});

    	return block;
    }

    // (112:4) {#if optimizing || error}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;
    	let div1_transition;
    	let current;
    	let if_block0 = /*optimizing*/ ctx[2] && create_if_block_2(ctx);
    	let if_block1 = /*error*/ ctx[3] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "id", "overlay-bg");
    			attr_dev(div0, "class", "svelte-16ndu7x");
    			add_location(div0, file, 113, 12, 3659);
    			attr_dev(div1, "id", "overlay");
    			attr_dev(div1, "class", "svelte-16ndu7x");
    			add_location(div1, file, 112, 8, 3589);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t1);
    			if (if_block1) if_block1.m(div1, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*optimizing*/ ctx[2]) {
    				if (if_block0) {
    					if (dirty & /*optimizing*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div1, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*error*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*error*/ 8) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div1, null);
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
    			transition_in(if_block0);
    			transition_in(if_block1);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching && div1_transition) div1_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(112:4) {#if optimizing || error}",
    		ctx
    	});

    	return block;
    }

    // (115:12) {#if optimizing}
    function create_if_block_2(ctx) {
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
    			attr_dev(img, "class", "svelte-16ndu7x");
    			add_location(img, file, 115, 16, 3734);
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
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(115:12) {#if optimizing}",
    		ctx
    	});

    	return block;
    }

    // (118:12) {#if error}
    function create_if_block_1(ctx) {
    	let div0;
    	let t0;
    	let br0;
    	let br1;
    	let t1;
    	let t2;
    	let div0_transition;
    	let t3;
    	let div1;
    	let img;
    	let img_src_value;
    	let div1_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text("😞 Error!");
    			br0 = element("br");
    			br1 = element("br");
    			t1 = space();
    			t2 = text(/*errorMessage*/ ctx[4]);
    			t3 = space();
    			div1 = element("div");
    			img = element("img");
    			add_location(br0, file, 119, 29, 3978);
    			add_location(br1, file, 119, 33, 3982);
    			attr_dev(div0, "id", "error");
    			attr_dev(div0, "class", "svelte-16ndu7x");
    			add_location(div0, file, 118, 16, 3895);
    			attr_dev(img, "id", "close-bg");
    			if (!src_url_equal(img.src, img_src_value = "images/close.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "close");
    			attr_dev(img, "class", "svelte-16ndu7x");
    			add_location(img, file, 123, 20, 4166);
    			attr_dev(div1, "id", "close");
    			attr_dev(div1, "class", "svelte-16ndu7x");
    			add_location(div1, file, 122, 16, 4066);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			append_dev(div0, br0);
    			append_dev(div0, br1);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*closeOverlay*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*errorMessage*/ 16) set_data_dev(t2, /*errorMessage*/ ctx[4]);
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, { duration: 100 }, true);
    				div0_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div0_transition) div0_transition = create_bidirectional_transition(div0, fade, { duration: 100 }, false);
    			div0_transition.run(0);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, { duration: 100 }, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching && div0_transition) div0_transition.end();
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			if (detaching && div1_transition) div1_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(118:12) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div3;
    	let h1;
    	let t1;
    	let div0;
    	let current_block_type_index;
    	let if_block0;
    	let t2;
    	let div1;
    	let input;
    	let t3;
    	let div2;
    	let p;
    	let t4;
    	let b;
    	let t5_value = (/*totalSizeUncompressed*/ ctx[5] / 1024).toFixed(2) + "";
    	let t5;
    	let t6;
    	let t7_value = (/*totalSize*/ ctx[6] / 1024).toFixed(2) + "";
    	let t7;
    	let t8;
    	let t9;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block_3, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*images*/ ctx[0].length > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = (/*optimizing*/ ctx[2] || /*error*/ ctx[3]) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Image Optimizer";
    			t1 = space();
    			div0 = element("div");
    			if_block0.c();
    			t2 = space();
    			div1 = element("div");
    			input = element("input");
    			t3 = space();
    			div2 = element("div");
    			p = element("p");
    			t4 = text("Total size: ");
    			b = element("b");
    			t5 = text(t5_value);
    			t6 = text(" Kb / ");
    			t7 = text(t7_value);
    			t8 = text(" Kb zip");
    			t9 = space();
    			if (if_block1) if_block1.c();
    			add_location(h1, file, 83, 8, 2253);
    			attr_dev(div0, "id", "images");
    			attr_dev(div0, "class", "svelte-16ndu7x");
    			add_location(div0, file, 84, 8, 2287);
    			input.disabled = /*disabled*/ ctx[7];
    			attr_dev(input, "type", "button");
    			input.value = "⚙️ Optimize";
    			add_location(input, file, 105, 12, 3277);
    			attr_dev(div1, "id", "buttons");
    			add_location(div1, file, 104, 8, 3245);
    			add_location(b, file, 108, 27, 3422);
    			attr_dev(p, "class", "svelte-16ndu7x");
    			add_location(p, file, 108, 12, 3407);
    			attr_dev(div2, "id", "info");
    			attr_dev(div2, "class", "svelte-16ndu7x");
    			add_location(div2, file, 107, 8, 3378);
    			attr_dev(div3, "id", "ui");
    			attr_dev(div3, "class", "svelte-16ndu7x");
    			add_location(div3, file, 82, 4, 2230);
    			attr_dev(main, "class", "svelte-16ndu7x");
    			add_location(main, file, 81, 0, 2218);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div3);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(div3, t2);
    			append_dev(div3, div1);
    			append_dev(div1, input);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, p);
    			append_dev(p, t4);
    			append_dev(p, b);
    			append_dev(b, t5);
    			append_dev(b, t6);
    			append_dev(b, t7);
    			append_dev(b, t8);
    			append_dev(main, t9);
    			if (if_block1) if_block1.m(main, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "click", /*optimize*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				} else {
    					if_block0.p(ctx, dirty);
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(div0, null);
    			}

    			if (!current || dirty & /*disabled*/ 128) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[7]);
    			}

    			if ((!current || dirty & /*totalSizeUncompressed*/ 32) && t5_value !== (t5_value = (/*totalSizeUncompressed*/ ctx[5] / 1024).toFixed(2) + "")) set_data_dev(t5, t5_value);
    			if ((!current || dirty & /*totalSize*/ 64) && t7_value !== (t7_value = (/*totalSize*/ ctx[6] / 1024).toFixed(2) + "")) set_data_dev(t7, t7_value);

    			if (/*optimizing*/ ctx[2] || /*error*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*optimizing, error*/ 12) {
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
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			dispose();
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
    	let disabled;
    	let totalSize;
    	let totalSizeUncompressed;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let sse;
    	let images = [];
    	let config = { images: {} };
    	let optimizing = false;
    	let error = false;
    	let errorMessage = "";

    	async function updateImages() {
    		const res = await apiRequest({ method: "imagesList" });
    		$$invalidate(0, images = res.data.images);
    		console.log(images);
    	}

    	async function updateConfig() {
    		const res = await apiRequest({ method: "imagesConfig" });
    		$$invalidate(1, config = res.data.config);
    		console.log(config);
    	}

    	async function optimize() {
    		$$invalidate(2, optimizing = true);
    		const res = await apiRequest({ method: "optimizeImages", config });

    		if (!res.ok) {
    			$$invalidate(3, error = true);
    			$$invalidate(4, errorMessage = res.message);
    		}

    		await updateConfig();
    		$$invalidate(2, optimizing = false);
    	}

    	async function closeOverlay() {
    		$$invalidate(3, error = false);
    		$$invalidate(4, errorMessage = "");
    		$$invalidate(2, optimizing = false);
    	}

    	onMount(async () => {
    		await updateImages();
    		await updateConfig();
    		sse = new EventSource("/sse?events=watcher");

    		sse.onmessage = async function (event) {
    			const data = JSON.parse(event.data);

    			if (data.subsystem === "images") {
    				await updateImages();
    			}
    		};

    		sse.onerror = function (error) {
    			console.error("EventSource failed: ", error);
    		};
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		ImageSettings,
    		sse,
    		images,
    		config,
    		optimizing,
    		error,
    		errorMessage,
    		apiRequest,
    		updateImages,
    		updateConfig,
    		optimize,
    		closeOverlay,
    		totalSizeUncompressed,
    		totalSize,
    		disabled
    	});

    	$$self.$inject_state = $$props => {
    		if ('sse' in $$props) sse = $$props.sse;
    		if ('images' in $$props) $$invalidate(0, images = $$props.images);
    		if ('config' in $$props) $$invalidate(1, config = $$props.config);
    		if ('optimizing' in $$props) $$invalidate(2, optimizing = $$props.optimizing);
    		if ('error' in $$props) $$invalidate(3, error = $$props.error);
    		if ('errorMessage' in $$props) $$invalidate(4, errorMessage = $$props.errorMessage);
    		if ('totalSizeUncompressed' in $$props) $$invalidate(5, totalSizeUncompressed = $$props.totalSizeUncompressed);
    		if ('totalSize' in $$props) $$invalidate(6, totalSize = $$props.totalSize);
    		if ('disabled' in $$props) $$invalidate(7, disabled = $$props.disabled);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*images*/ 1) {
    			$$invalidate(7, disabled = images.length === 0);
    		}

    		if ($$self.$$.dirty & /*config*/ 2) {
    			$$invalidate(6, totalSize = Object.values(config.images).reduce((total, value) => total + value.compressed.weight, 0));
    		}

    		if ($$self.$$.dirty & /*config*/ 2) {
    			$$invalidate(5, totalSizeUncompressed = Object.values(config.images).reduce((total, value) => total + value.compressed.unzipped, 0));
    		}
    	};

    	return [
    		images,
    		config,
    		optimizing,
    		error,
    		errorMessage,
    		totalSizeUncompressed,
    		totalSize,
    		disabled,
    		optimize,
    		closeOverlay
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

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
